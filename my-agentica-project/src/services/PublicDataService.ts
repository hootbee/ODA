import type { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs/promises";
import * as path from "path";
import { HybridQueryPlannerService } from "./HybridQueryPlannerService";
import { DataUtilizationService } from "./DataUtilizationService";
import {
  type DataInfo,
  type SingleLikeDTO,
  type AllRecommendationsDTO,
} from "./dataUtilization.schema";
import { DataDownloaderService } from "./DataDownloaderService";
import { DataAnalysisService, DataAnalysisDeps } from "./DataAnalysisService";

interface AnalyzeDataParams {
    publicDataPk?: string;
    prompt?: string;
    id?: string;
    portal?: "seoul" | "data" | "url";
    directUrl?: string;
    fileDetailSn?: number;
}

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

  public async analyzeDataByPk(input: AnalyzeDataParams) {
    console.log("\n[DEBUG: PublicDataService.ts] --------------------------------------------------");
    console.log("[DEBUG: PublicDataService.ts] analyzeDataByPk 진입");
    console.log("[DEBUG: PublicDataService.ts] 입력값 (input):", input);

    const {
        prompt = "데이터 분석해줘",
        portal = "seoul", // Default to Seoul Open Data
        directUrl,
        fileDetailSn,
    } = input;

    // Determine the source identifier
    const sourceId = input.publicDataPk ?? input.id ?? this.conversationState.lastDataInfo?.pk;
    console.log(`[DEBUG: PublicDataService.ts] 분석 대상 ID: ${sourceId}`);
    if (!sourceId) throw new Error("분석할 데이터의 식별자(publicDataPk or id)가 필요합니다.");

    // Construct the full source URL if needed (for seoul portal)
    let downloadSource: string;
    if (portal === "url") {
        if (!directUrl) throw new Error("directUrl is required when portal is 'url'");
        downloadSource = directUrl;
    } else if (portal === "seoul") {
        downloadSource = `https://data.seoul.go.kr/dataList/${encodeURIComponent(String(sourceId))}/S/1/datasetView.do`;
    } else {
        downloadSource = sourceId; // Assumes it's a data.go.kr PK
    }

    const useHistory = this.conversationState.lastAction === "analysis" && this.conversationState.lastDataInfo?.pk === sourceId;
    console.log(`[DEBUG: PublicDataService.ts] 히스토리 사용: ${useHistory}`);

    let downloadedFilePath: string | null = null;
    try {
      await fs.mkdir(this.downloadsDir, { recursive: true });
      console.log("[DEBUG: PublicDataService.ts] 파일 다운로드 시작...");

      // Pass fileDetailSn to the downloader
      downloadedFilePath = await this.downloaderService.downloadDataFile(downloadSource, this.downloadsDir, {
          fileDetailSn: fileDetailSn ? Number(fileDetailSn) : undefined,
      });
      const fileName = path.basename(downloadedFilePath);
      console.log(`[DEBUG: PublicDataService.ts] 파일 다운로드 완료: ${fileName}`);

      if (!downloadedFilePath.toLowerCase().endsWith(".csv")) {
        await this.safeUnlink(downloadedFilePath);
        console.warn(`[DEBUG: PublicDataService.ts] CSV 파일이 아니므로 분석 중단: ${fileName}`);
        return { success: true, analysis: null, publicDataPk: sourceId, message: "다운로드된 파일이 CSV가 아닙니다.", fileName };
      }

      const previousResult = useHistory ? (this.conversationState.lastResponse as string) : undefined;
      console.log("[DEBUG: PublicDataService.ts] analysisService.analyzeCsvFile 호출 예정...");
      const analysis = await this.analysisService.analyzeCsvFile(downloadedFilePath, fileName, prompt, previousResult);
      console.log("[DEBUG: PublicDataService.ts] analysisService로부터 분석 결과 수신 완료");

      await this.safeUnlink(downloadedFilePath);
      console.log("[DEBUG: PublicDataService.ts] 분석 후 임시 파일 삭제 완료");

      this.conversationState = {
        lastQuery: prompt,
        lastResponse: analysis,
        lastAction: "analysis",
        lastDataInfo: { pk: sourceId, fileName },
      };
      console.log("[DEBUG: PublicDataService.ts] conversationState 업데이트 완료");
      return { success: true, analysis, publicDataPk: sourceId, fileName };
    } finally {
      if (downloadedFilePath) await this.safeUnlink(downloadedFilePath);
    }
  }
  public async downloadFileBuffer(
      publicDataPk:string,
      opts?:{fileDetailSn?: number}
  ): Promise<{buffer:Buffer; fileName: string; contentType: string}>{
    return this.downloaderService.downloadDataFileAsBuffer(publicDataPk, opts);
  }
  // public async downloadFileBuffer(publicDataPk: string) {
  //   // DataDownloaderService의 버퍼 반환 메서드로 위임
  //   return this.downloaderService.downloadDataFileAsBuffer(publicDataPk);
  // }

  public async downloadAndAnalyze(params: DownloadAndAnalyzeParams): Promise<any> {
    console.log("\n[TEST] ===== PublicDataService.downloadAndAnalyze 시작 =====");
    const {
        id,
        portal = "seoul",
        directUrl,
        fileDetailSn,
        saveDir = path.join(this.downloadsDir, "tmp"),
        prompt = "파일의 내용을 분석하고, 핵심 인사이트를 담은 보고서를 작성해줘.",
    } = params;

    // 1) 소스 판별
    let source: string;
    if (portal === "url") {
        if (!directUrl) throw new Error("directUrl required when portal==='url'");
        source = String(directUrl);
    } else if (portal === "seoul") {
        if (!id) throw new Error("id required for portal==='seoul'");
        source = `https://data.seoul.go.kr/dataList/${encodeURIComponent(String(id))}/S/1/datasetView.do`;
    } else if (portal === "data") {
        if (!id) throw new Error("id required for portal==='data'");
        source = String(id);
    } else {
        throw new Error("unsupported portal");
    }

    await fs.mkdir(saveDir, { recursive: true });

    // 2) 파일 다운로드 (디스크 저장)
    const dummyTarget = path.join(saveDir, ".placeholder");
    const savedPath = await this.downloaderService.downloadDataFile(source, dummyTarget, {
        fileDetailSn: fileDetailSn ? Number(fileDetailSn) : undefined,
    });
    const fileName = path.basename(savedPath);

    console.log(`[TEST] 다운로드 완료 → ${savedPath}`);

    // 3) CSV 분석 (결과는 터미널로만 출력)
    const report = await this.analysisService.analyzeCsvFile(savedPath, fileName, prompt);

    console.log("\n====================[ 분석 보고서 START ]====================\n");
    console.log(report);
    console.log("\n=====================[ 분석 보고서 END ]=====================\n");

    // 4) 응답은 메타만
    return {
        ok: true,
        portal,
        sourceHint: portal === "url" ? directUrl : id,
        savedPath,
        fileName,
        note: "실제 분석 보고서는 서버 터미널(log)로만 출력됩니다.",
    };
  }

  private async safeUnlink(p: string) {
    try { await fs.unlink(p); } catch {}
  }
}