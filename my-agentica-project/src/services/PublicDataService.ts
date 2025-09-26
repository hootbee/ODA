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

    const previousResult = this.conversationState.lastResponse;

    const dto = isSingle
        ? await this.utilizationService.generateSingleByPrompt(dataInfo, cleanPrompt, previousResult)
        : await this.utilizationService.generateSimplePassThrough(cleanPrompt, previousResult);
    
    this.conversationState = {
      lastQuery: userPrompt,
      lastResponse: dto,
      lastAction: "utilization",
      lastDataInfo: dataInfo,
    };

    return dto;
  }

  /* ===== 데이터 분석/다운로드 (로그 추가) ===== */

  public async analyzeDataByPk(input: { publicDataPk?: string; prompt?: string }) {
    console.log("\n[DEBUG: PublicDataService.ts] --------------------------------------------------");
    console.log("[DEBUG: PublicDataService.ts] analyzeDataByPk 진입");
    console.log("[DEBUG: PublicDataService.ts] 입력값 (input):", input);

    const { prompt = "데이터 분석해줘" } = input;
    const useHistory = this.conversationState.lastAction === "analysis";
    const pk = input.publicDataPk ?? this.conversationState.lastDataInfo?.pk;
    console.log(`[DEBUG: PublicDataService.ts] 분석 대상 PK: ${pk}, 히스토리 사용: ${useHistory}`);

    if (!pk) throw new Error("분석할 데이터의 PK(publicDataPk)가 필요합니다.");

    let downloadedFilePath: string | null = null;
    try {
      await fs.mkdir(this.downloadsDir, { recursive: true });
      console.log("[DEBUG: PublicDataService.ts] 파일 다운로드 시작...");
      downloadedFilePath = await this.downloaderService.downloadDataFile(pk, this.downloadsDir);
      const fileName = path.basename(downloadedFilePath);
      console.log(`[DEBUG: PublicDataService.ts] 파일 다운로드 완료: ${fileName}`);

      if (!downloadedFilePath.toLowerCase().endsWith(".csv")) {
        await this.safeUnlink(downloadedFilePath);
        console.warn(`[DEBUG: PublicDataService.ts] CSV 파일이 아니므로 분석 중단: ${fileName}`);
        return { success: true, analysis: null, publicDataPk: pk, message: "다운로드된 파일이 CSV가 아닙니다.", fileName };
      }

      const previousResult = useHistory ? (this.conversationState.lastResponse as string) : undefined;
      console.log("[DEBUG: PublicDataService.ts] analysisService.analyzeCsvFile 호출 예정...");
      console.log(`[DEBUG: PublicDataService.ts] 전달 파라미터: fileName='${fileName}', prompt='${prompt}', previousResult 존재여부=${!!previousResult}`);
      const analysis = await this.analysisService.analyzeCsvFile(downloadedFilePath, fileName, prompt, previousResult);
      console.log("[DEBUG: PublicDataService.ts] analysisService로부터 분석 결과 수신 완료");

      await this.safeUnlink(downloadedFilePath);
      console.log("[DEBUG: PublicDataService.ts] 분석 후 임시 파일 삭제 완료");

      this.conversationState = {
        lastQuery: prompt,
        lastResponse: analysis,
        lastAction: "analysis",
        lastDataInfo: { pk, fileName },
      };
      console.log("[DEBUG: PublicDataService.ts] conversationState 업데이트 완료");
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