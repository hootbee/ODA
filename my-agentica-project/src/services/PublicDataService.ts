// my-agentica-project/src/services/PublicDataService.ts
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

  // 대화의 단기 기억을 담당하는 상태 객체
  private conversationState: ConversationState = {};

  constructor(private readonly deps: Deps) {
    this.queryPlanner =
        deps.queryPlanner ?? new HybridQueryPlannerService(deps.llm, deps.model);
    this.utilizationService = new DataUtilizationService(deps.llm, deps.model);
    this.downloaderService = deps.downloader ?? new DataDownloaderService();
    this.analysisService =
        deps.analysis ??
        new DataAnalysisService({ llm: deps.llm, model: deps.model } satisfies DataAnalysisDeps);
    this.downloadsDir = deps.downloadsDir ?? path.resolve(process.cwd(), "downloads");
  }

  private isFollowUpQuery(prompt: string): boolean {
    const followUpKeywords = ["구체화", "자세히", "확장", "심화", "상세하게", "더 알려줘"];
    return followUpKeywords.some((keyword) => prompt.includes(keyword));
  }

  /** 데이터 주제가 바뀌었는지 감지하여 맥락 초기화 */
  private resetIfNewData(next?: Partial<DataInfo> & { pk?: string }) {
    if (!next) return;
    const prev = this.conversationState.lastDataInfo ?? {};
    // pk 또는 title이 변경되면 맥락 초기화
    const changed =
        (next.pk && prev.pk && next.pk !== prev.pk) ||
        (!!next.title && !!prev.title && next.title !== prev.title);

    if (changed) {
      this.conversationState = {};
    }
  }

  // --------------------------------------------------------------------------
  // 1. 검색/추천 (Stateless - 대화 히스토리 사용 안함)
  // --------------------------------------------------------------------------
  public async createQueryPlan(input: { prompt: string }): Promise<any> {
    this.conversationState = {}; // 새 검색은 히스토리 초기화
    return this.queryPlanner.createQueryPlan(input.prompt);
  }

  // --------------------------------------------------------------------------
  // 2. 활용방안 생성 (Stateful - 대화 히스토리 사용)
  // --------------------------------------------------------------------------

  /**
   * 전체 활용방안(비즈니스, 사회문제 등 4가지) 생성
   */
  public async generateAllUtilizationRecommendations(input: {
    title: string;
    description: string;
    keywords: string;
    category: string;
    prompt?: string;
    dataInfo?: DataInfo;
  }): Promise<AllRecommendationsDTO> {
    const dataInfo: DataInfo =
        input.dataInfo ?? {
          title: input.title,
          description: input.description,
          keywords: input.keywords,
          category: input.category,
        };

    // 주제(데이터)가 바뀌었으면 맥락 초기화
    this.resetIfNewData(dataInfo);

    const { prompt = "전체 활용방안" } = input;
    const useHistory =
        this.isFollowUpQuery(prompt) &&
        this.conversationState.lastAction === "utilization";
    const previousResult = useHistory ? this.conversationState.lastResponse : undefined;

    const result = await this.utilizationService.generateAllRecommendations(
        dataInfo,
        previousResult,
    );

    this.conversationState = {
      lastQuery: prompt,
      lastResponse: result,
      lastAction: "utilization",
      lastDataInfo: dataInfo,
    };
    return result;
  }

  /**
   * 단일 종류(예: 비즈니스)의 활용방안 생성
   */
  public async generateSingleUtilizationRecommendation(input: {
    title: string;
    description: string;
    keywords: string;
    category: string;
    analysisType: string; // "비즈니스 활용" | "정책 제안" | "더 자세히 설명해줘" 등
    dataInfo?: DataInfo;
  }): Promise<SingleRecommendationDTO> {
    const dataInfo: DataInfo =
        input.dataInfo ?? {
          title: input.title,
          description: input.description,
          keywords: input.keywords,
          category: input.category,
        };

    // 주제(데이터)가 바뀌었으면 맥락 초기화
    this.resetIfNewData(dataInfo);

    const { analysisType } = input;
    const useHistory =
        this.isFollowUpQuery(analysisType) &&
        this.conversationState.lastAction === "utilization";
    const previousResult = useHistory ? this.conversationState.lastResponse : undefined;

    const result = await this.utilizationService.generateSingleRecommendation(
        dataInfo,
        analysisType,
        previousResult,
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
  // 3. 데이터 확인/분석 (Stateful - 대화 히스토리 사용)
  // --------------------------------------------------------------------------

  /**
   * PK로 데이터를 다운로드하고 분석 리포트 생성
   */
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
      throw new Error("분석할 데이터의 PK(publicDataPk)가 필요합니다. 먼저 데이터를 검색해주세요.");
    }

    let downloadedFilePath: string | null = null;
    try {
      await fs.mkdir(this.downloadsDir, { recursive: true });

      downloadedFilePath = await this.downloaderService.downloadDataFile(
          pk,
          this.downloadsDir,
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
          previousResult,
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
      // 에러 발생 시 히스토리 초기화
      this.conversationState = {};
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // 4. 다운로드 (Stateless - 대화 히스토리 사용 안함)
  // --------------------------------------------------------------------------
  public async downloadFileByPk(publicDataPk: string, savePath: string) {
    this.conversationState = {}; // 다운로드는 히스토리 초기화
    return this.downloaderService.downloadDataFile(publicDataPk, savePath);
  }

  private async safeUnlink(p: string) {
    try {
      await fs.unlink(p);
    } catch {}
  }
}