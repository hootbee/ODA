import type { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs/promises";
import * as path from "path";
import { HybridQueryPlannerService } from "./HybridQueryPlannerService";
import {
  DataUtilizationService,
  type DataInfo,
  type SingleLikeDTO,
  type AllRecommendationsDTO,
} from "./DataUtilizationService";
import { DataDownloaderService } from "./DataDownloaderService";
import { DataAnalysisService, DataAnalysisDeps } from "./DataAnalysisService";

interface ConversationState {
  lastQuery?: string;
  lastResponse?: any;
  lastAction?: "utilization" | "analysis" | null;
  lastDataInfo?: { pk?: string; title?: string; [key: string]: any };
}

type Deps = {
  llm: GoogleGenerativeAI;
  model: string;
  queryPlanner?: HybridQueryPlannerService;
  downloader?: DataDownloaderService;
  analysis?: DataAnalysisService;
  downloadsDir?: string;
};

export class PublicDataService {
  private readonly queryPlanner: HybridQueryPlannerService;
  private readonly utilizationService: DataUtilizationService;
  private readonly downloaderService: DataDownloaderService;
  private readonly analysisService: DataAnalysisService;
  private readonly downloadsDir: string;
  private conversationState: ConversationState = {};

  constructor(private readonly deps: Deps) {
    this.queryPlanner = deps.queryPlanner ?? new HybridQueryPlannerService(deps.llm, deps.model);
    this.utilizationService = new DataUtilizationService(deps.llm, deps.model);
    this.downloaderService = deps.downloader ?? new DataDownloaderService();
    this.analysisService =
        deps.analysis ??
        new DataAnalysisService({ llm: deps.llm, model: deps.model } satisfies DataAnalysisDeps);
    this.downloadsDir = deps.downloadsDir ?? path.resolve(process.cwd(), "downloads");
  }

  // [수정] isFollowUpQuery 함수 삭제

  public async createQueryPlan(input: { prompt: string }): Promise<any> {
    this.conversationState = {};
    return this.queryPlanner.createQueryPlan(input.prompt);
  }

  /** 전체 활용방안 */
  public async generateAllUtilizationRecommendations(input: {
    dataInfo?: DataInfo;
    title?: string;
    description?: string;
    keywords?: string;
    category?: string;
    prompt?: string;
  }): Promise<AllRecommendationsDTO> {
    const dataInfo =
        input.dataInfo ??
        ({
          title: input.title!,
          description: input.description!,
          keywords: input.keywords!,
          category: input.category!,
        } as DataInfo);

    const prompt = input.prompt ?? "전체 활용방안";
    // [수정] lastAction만 확인하여 맥락 사용 결정 (더 관대한 기준)
    const useHistory = this.conversationState.lastAction === "utilization";
    const previousResult = useHistory ? this.conversationState.lastResponse : undefined;

    const result = await this.utilizationService.generateAllRecommendations(dataInfo, previousResult);

    this.conversationState = {
      lastQuery: prompt,
      lastResponse: result,
      lastAction: "utilization",
      lastDataInfo: dataInfo,
    };
    return result;
  }

  /**
   * 단일/심플 통합 진입점
   * - prompt가 '!활용'으로 시작하면 → 단일(single) 모드 (맥락 O, 정형화된 프롬프트)
   * - 아니면 → 심플(simple) 모드 (맥락 X, 자유 프롬프트)
   */
  public async generateOneOrSimple(input: {
    dataInfo?: DataInfo;
    title?: string;
    description?: string;
    keywords?: string;
    category?: string;
    prompt: string;
  }): Promise<SingleLikeDTO> {
    const dataInfo =
        input.dataInfo ??
        ({
          title: input.title!,
          description: input.description!,
          keywords: input.keywords!,
          category: input.category!,
        } as DataInfo);

    const userPrompt = input.prompt || "";
    const isSingle = userPrompt.trim().startsWith("/활용");
    const cleanPrompt = isSingle ? userPrompt.replace(/^\/활용\s*/, "") : userPrompt;

    // [수정] isSingle(즉, !활용 유무)에 따라 맥락 사용 여부 결정
    const previousResult = isSingle ? this.conversationState.lastResponse : undefined;

    const dto = isSingle
        ? await this.utilizationService.generateSingleByPrompt(dataInfo, cleanPrompt, previousResult)
        : await this.utilizationService.generateSimplePassThrough(cleanPrompt, undefined); // 항상 맥락 없이 호출
    
    this.conversationState = {
      lastQuery: userPrompt,
      lastResponse: dto,
      lastAction: "utilization",
      lastDataInfo: dataInfo,
    };

    return dto;
  }

  /* ===== 데이터 분석/다운로드는 기존 그대로 유지 ===== */

  public async analyzeDataByPk(input: { publicDataPk?: string; prompt?: string }) {
    const { prompt = "데이터 분석해줘" } = input;
    // [수정] lastAction만 확인하여 맥락 사용 결정
    const useHistory = this.conversationState.lastAction === "analysis";
    const pk = input.publicDataPk ?? this.conversationState.lastDataInfo?.pk;
    if (!pk) throw new Error("분석할 데이터의 PK(publicDataPk)가 필요합니다.");

    let downloadedFilePath: string | null = null;
    try {
      await fs.mkdir(this.downloadsDir, { recursive: true });
      downloadedFilePath = await this.downloaderService.downloadDataFile(pk, this.downloadsDir);
      const fileName = path.basename(downloadedFilePath);

      if (!downloadedFilePath.toLowerCase().endsWith(".csv")) {
        await this.safeUnlink(downloadedFilePath);
        return { success: true, analysis: null, publicDataPk: pk, message: "다운로드된 파일이 CSV가 아닙니다.", fileName };
      }

      const previousResult = useHistory ? (this.conversationState.lastResponse as string) : undefined;
      const analysis = await this.analysisService.analyzeCsvFile(downloadedFilePath, prompt, previousResult);

      await this.safeUnlink(downloadedFilePath);
      this.conversationState = {
        lastQuery: prompt,
        lastResponse: analysis,
        lastAction: "analysis",
        lastDataInfo: { pk, fileName },
      };
      return { success: true, analysis, publicDataPk: pk, fileName };
    } finally {
      if (downloadedFilePath) await this.safeUnlink(downloadedFilePath);
    }
  }

  public async downloadFileByPk(publicDataPk: string, savePath: string) {
    this.conversationState = {};
    return this.downloaderService.downloadDataFile(publicDataPk, savePath);
  }

  private async safeUnlink(p: string) {
    try { await fs.unlink(p); } catch {}
  }
}