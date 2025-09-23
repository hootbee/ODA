// src/services/PublicDataService.ts
import type { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs/promises";
import * as path from "path";
import { HybridQueryPlannerService } from "./HybridQueryPlannerService";
import {
  DataUtilizationService,
  type DataInfo,
  type SingleRecommendationDTO,
  type AllRecommendationsDTO,
} from "./DataUtilizationService";
import { DataDownloaderService } from "./DataDownloaderService";
import { DataAnalysisService, DataAnalysisDeps } from "./DataAnalysisService";

// --- 대화 히스토리 관리를 위한 상태 객체 ---
interface ConversationState {
  lastQuery?: string;
  lastResponse?: any;
  lastAction?: "utilization" | "analysis" | null;
  lastDataInfo?: {
    pk?: string;
    title?: string;
    [key: string]: any;
  };
}

// --- 서비스 의존성 주입 타입 ---
type Deps = {
  llm: GoogleGenerativeAI;
  model: string;
  queryPlanner?: HybridQueryPlannerService;
  downloader?: DataDownloaderService;
  analysis?: DataAnalysisService;
  downloadsDir?: string;
};

/**
 * 공공데이터 포털의 핵심 기능을 제공하는 메인 서비스
 * - 검색, 추천, 활용방안, 분석 등 다양한 기능을 총괄
 * - 대화 상태를 관리하며, 특정 기능에 한해 연속적인 대화를 지원
 */
export class PublicDataService {
  private readonly queryPlanner: HybridQueryPlannerService;
  private readonly utilizationService: DataUtilizationService;
  private readonly downloaderService: DataDownloaderService;
  private readonly analysisService: DataAnalysisService;
  private readonly downloadsDir: string;

  private conversationState: ConversationState = {};

  constructor(private readonly deps: Deps) {
    this.queryPlanner =
        deps.queryPlanner ?? new HybridQueryPlannerService(deps.llm, deps.model);
    this.utilizationService = new DataUtilizationService(
        deps.llm,
        deps.model
    );
    this.downloaderService = deps.downloader ?? new DataDownloaderService();
    this.analysisService =
        deps.analysis ??
        new DataAnalysisService(
            { llm: deps.llm, model: deps.model } satisfies DataAnalysisDeps
        );
    this.downloadsDir =
        deps.downloadsDir ?? path.resolve(process.cwd(), "downloads");
  }

  private isFollowUpQuery(prompt: string): boolean {
    const followUpKeywords = ["구체화", "자세히", "확장", "심화", "상세하게", "더 알려줘"];
    return followUpKeywords.some((k) => prompt.includes(k));
  }

  /** 데이터 주제가 바뀌었는지 감지하여 맥락 초기화 */
  private resetIfNewData(next?: Partial<DataInfo> & { pk?: string }) {
    if (!next) return;
    const prev = this.conversationState.lastDataInfo ?? {};
    const changed =
        (next.pk && prev.pk && next.pk !== prev.pk) ||
        (!!next.title && !!prev.title && next.title !== prev.title);

    if (changed) {
      this.conversationState = {};
    }
  }

  // --------------------------------------------------------------------------
  // 1) 검색/추천 (Stateless)
  // --------------------------------------------------------------------------
  public async createQueryPlan(input: { prompt: string }): Promise<any> {
    this.conversationState = {};
    return this.queryPlanner.createQueryPlan(input.prompt);
  }

  // --------------------------------------------------------------------------
  // 2) 활용방안 생성 (Stateful)
  // --------------------------------------------------------------------------
  public async generateAllUtilizationRecommendations(input: {
    title: string;
    description: string;
    keywords: string;
    category: string;
    prompt?: string;
    dataInfo?: DataInfo;
  }): Promise<AllRecommendationsDTO> {
    const dataInfo =
        input.dataInfo ?? ({
          title: input.title,
          description: input.description,
          keywords: input.keywords,
          category: input.category,
        } as DataInfo);

    this.resetIfNewData(dataInfo);

    const { prompt = "전체 활용방안" } = input;
    const useHistory =
        this.isFollowUpQuery(prompt) &&
        this.conversationState.lastAction === "utilization";
    const previousResult = useHistory ? this.conversationState.lastResponse : undefined;

    const result = await this.utilizationService.generateAllRecommendations(
        dataInfo,
        previousResult
    );

    this.conversationState = {
      lastQuery: prompt,
      lastResponse: result,
      lastAction: "utilization",
      lastDataInfo: dataInfo,
    };
    return result;
  }

  public async generateSingleUtilizationRecommendation(input: {
    title: string;
    description: string;
    keywords: string;
    category: string;
    analysisType: string;
    dataInfo?: DataInfo;
  }): Promise<SingleRecommendationDTO> {
    const dataInfo =
        input.dataInfo ?? ({
          title: input.title,
          description: input.description,
          keywords: input.keywords,
          category: input.category,
        } as DataInfo);

    this.resetIfNewData(dataInfo);

    const { analysisType } = input;
    const useHistory =
        this.isFollowUpQuery(analysisType) &&
        this.conversationState.lastAction === "utilization";
    const previousResult = useHistory ? this.conversationState.lastResponse : undefined;

    const result = await this.utilizationService.generateSingleRecommendation(
        dataInfo,
        analysisType,
        previousResult
    );

    this.conversationState = {
      lastQuery: analysisType,
      lastResponse: result,
      lastAction: "utilization",
      lastDataInfo: dataInfo,
    };
    return result;
  }

  // --------------------------------------------------------------------------
  // 3) 데이터 확인/분석 (Stateful)
  // --------------------------------------------------------------------------
  public async analyzeDataByPk(input: {
    publicDataPk?: string;
    prompt?: string;
  }): Promise<{
    success: boolean;
    analysis: string | null;
    publicDataPk: string;
    message?: string;
    fileName?: string;
  }> {
    const { prompt = "데이터 분석해줘" } = input;
    const useHistory =
        this.isFollowUpQuery(prompt) &&
        this.conversationState.lastAction === "analysis";
    const pk = input.publicDataPk ?? this.conversationState.lastDataInfo?.pk;

    if (!pk) {
      throw new Error(
          "분석할 데이터의 PK(publicDataPk)가 필요합니다. 먼저 데이터를 검색해주세요."
      );
    }

    let downloadedFilePath: string | null = null;
    try {
      await fs.mkdir(this.downloadsDir, { recursive: true });

      downloadedFilePath = await this.downloaderService.downloadDataFile(
          pk,
          this.downloadsDir
      );
      const fileName = path.basename(downloadedFilePath);

      if (!downloadedFilePath.toLowerCase().endsWith(".csv")) {
        await this.safeUnlink(downloadedFilePath);
        return {
          success: true,
          analysis: null,
          publicDataPk: pk,
          message: "다운로드된 파일이 CSV가 아니므로 분석을 진행하지 않았습니다.",
          fileName,
        };
      }

      const previousResult = useHistory
          ? (this.conversationState.lastResponse as string)
          : undefined;
      const analysis = await this.analysisService.analyzeCsvFile(
          downloadedFilePath,
          prompt,
          previousResult
      );

      await this.safeUnlink(downloadedFilePath);

      this.conversationState = {
        lastQuery: prompt,
        lastResponse: analysis,
        lastAction: "analysis",
        lastDataInfo: { pk, fileName },
      };

      return { success: true, analysis, publicDataPk: pk, fileName };
    } catch (error) {
      if (downloadedFilePath) await this.safeUnlink(downloadedFilePath);
      this.conversationState = {};
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // 4) 다운로드 (Stateless)
  // --------------------------------------------------------------------------
  public async downloadFileByPk(publicDataPk: string, savePath: string) {
    this.conversationState = {};
    return this.downloaderService.downloadDataFile(publicDataPk, savePath);
  }

  /** 서버 라우터에서 스트리밍용 사용 */
  public async downloadFileBuffer(publicDataPk: string) {
    return this.downloaderService.downloadDataFileAsBuffer(publicDataPk);
  }

  private async safeUnlink(p: string) {
    try {
      await fs.unlink(p);
    } catch {}
  }
}