// services/PublicDataService.ts
import type OpenAI from "openai";
import * as fs from "fs/promises";
import * as path from "path";
import { HybridQueryPlannerService } from "./HybridQueryPlannerService";
import { DataUtilizationService } from "./DataUtilizationService";
import { DataDownloaderService } from "./DataDownloaderService";
import { DataAnalysisService, DataAnalysisDeps } from "./DataAnalysisService";

type Deps = {
  llm: OpenAI;                 // 단일 LLM 클라이언트(OpenAI SDK · Gemini 호환)
  model: string;               // 기본 모델명 (예: "gemini-1.5-flash")
  queryPlanner?: HybridQueryPlannerService;  // (선택) 외부 주입
  downloader?: DataDownloaderService;        // (선택) 외부 주입
  analysis?: DataAnalysisService;            // (선택) 외부 주입
  downloadsDir?: string;       // (선택) 임시 저장 디렉터리 (기본값: ./downloads)
};

export class PublicDataService {
  private readonly queryPlanner: HybridQueryPlannerService;
  private readonly utilizationService: DataUtilizationService;
  private readonly downloaderService: DataDownloaderService;
  private readonly analysisService: DataAnalysisService;
  private readonly downloadsDir: string;

  constructor(private readonly deps: Deps) {
    this.queryPlanner =
        deps.queryPlanner ?? new HybridQueryPlannerService(deps.llm, deps.model);

    this.utilizationService = new DataUtilizationService(deps.llm, deps.model);

    this.downloaderService =
        deps.downloader ?? new DataDownloaderService();

    this.analysisService =
        deps.analysis ??
        new DataAnalysisService({
          llm: deps.llm,
          model: deps.model,
        } satisfies DataAnalysisDeps);

    this.downloadsDir =
        deps.downloadsDir ?? path.resolve(process.cwd(), "downloads");
  }

  // ------------------------------
  // 검색/추천
  // ------------------------------
  public async createQueryPlan(input: { prompt: string }): Promise<any> {
    return this.queryPlanner.createQueryPlan(input.prompt);
  }

  public async recommendData(input: {
    prompt: string;
    candidates: string[];
  }): Promise<{ recommendations: string[] }> {
    const { prompt, candidates } = input;
    const plan = await this.queryPlanner.createQueryPlan(prompt);
    const filtered = await this.filterByRelevance(
        prompt,
        candidates,
        plan.majorCategory
    );
    const finalRecommendations = filtered.slice(0, plan.limit);
    return { recommendations: finalRecommendations };
  }

  private async filterByRelevance(
      prompt: string,
      candidates: string[],
      majorCategory: string
  ): Promise<string[]> {
    const lowerPrompt = prompt.toLowerCase();
    const plan = await this.queryPlanner.createQueryPlan(prompt);
    const promptTokens = plan.keywords || [];

    return candidates
        .map((candidate) => ({
          name: candidate,
          score: this.calculateRelevanceScore(
              candidate,
              promptTokens,
              majorCategory,
              lowerPrompt
          ),
        }))
        .sort((a, b) => b.score - a.score)
        .map((item) => item.name);
  }

  private calculateRelevanceScore(
      candidate: string,
      promptTokens: string[],
      majorCategory: string,
      originalPrompt: string
  ): number {
    const lc = candidate.toLowerCase();
    let score = 0;

    for (const t of promptTokens) if (lc.includes(t.toLowerCase())) score += 15;
    if (majorCategory && lc.includes(majorCategory.toLowerCase())) score += 25;

    const tokens = lc.split(/[\s_-]+/);
    for (const t of promptTokens) if (tokens.includes(t.toLowerCase())) score += 10;

    if (candidate.length > 100) score -= 10;
    else if (candidate.length < 20) score -= 5;

    const specials = ["최신", "신규", "업데이트", "개선"];
    for (const k of specials)
      if (originalPrompt.includes(k) && lc.includes(k)) score += 5;

    return Math.max(0, score);
  }

  // ------------------------------
  // 활용방안 생성
  // ------------------------------
  public async generateUtilizationRecommendations(input: {
    fileName: string;
    title: string;
    category: string;
    keywords: string;
    description: string;
    providerAgency: string;
  }) {
    return this.utilizationService.generateRecommendations(input);
  }

  public async generateSingleUtilizationRecommendation(input: {
    dataInfo: any;
    analysisType: string; // "business" | "research" | "policy" | "social_problem" | 사용자 프롬프트
  }) {
    return this.utilizationService.generateSingleRecommendation(
        input.dataInfo,
        input.analysisType
    );
  }

  // ------------------------------
  // 다운로드/분석 (일원화)
  // ------------------------------
  /**
   * publicDataPk로 파일을 내려받아 CSV면 분석 후 삭제까지 처리.
   * CSV가 아니면 삭제 후 안내만 반환.
   */
  public async analyzeDataByPk(publicDataPk: string): Promise<{
    success: boolean;
    analysis: string | null;
    publicDataPk: string;
    message?: string;
    fileName?: string;
  }> {
    let downloadedFilePath: string | null = null;

    try {
      await fs.mkdir(this.downloadsDir, { recursive: true });

      console.log(`[Workflow] 1. Downloading data for PK: ${publicDataPk}`);
      // NOTE: DataDownloaderService의 downloadDataFile은 인자로 준 경로의 부모에 저장됨(내부 구현 특성).
      // 동작 호환을 위해 기존대로 디렉터리 경로를 전달한다.
      downloadedFilePath = await this.downloaderService.downloadDataFile(
          publicDataPk,
          this.downloadsDir
      );
      console.log(`[Workflow] File downloaded to: ${downloadedFilePath}`);

      const base = path.basename(downloadedFilePath);
      if (!downloadedFilePath.toLowerCase().endsWith(".csv")) {
        console.log(
            `[Workflow] 2. Not a CSV (${base}). Deleting file and returning message.`
        );
        await this.safeUnlink(downloadedFilePath);
        return {
          success: true,
          analysis: null,
          publicDataPk,
          message: "Downloaded file was not a CSV and has been deleted.",
          fileName: base,
        };
      }

      console.log(`[Workflow] 2. Analyzing CSV file: ${base}`);
      const analysis = await this.analysisService.analyzeCsvFile(
          downloadedFilePath
      );

      console.log(`[Workflow] 3. Deleting analyzed file.`);
      await this.safeUnlink(downloadedFilePath);

      console.log("[Workflow] 4. Workflow completed successfully.");
      return {
        success: true,
        analysis,
        publicDataPk,
        fileName: base,
      };
    } catch (error) {
      console.error("[Workflow] Error occurred:", error);
      if (downloadedFilePath) {
        await this.safeUnlink(downloadedFilePath);
      }
      throw error;
    }
  }

  /**
   * 파일을 바로 스트리밍할 때 사용 (메모리 버퍼 반환)
   */
  public async downloadFileBuffer(publicDataPk: string) {
    return this.downloaderService.downloadDataFileAsBuffer(publicDataPk);
  }

  /**
   * (호환용) 파일을 디스크로 저장
   */
  public async downloadFileByPk(publicDataPk: string, savePath: string) {
    return this.downloaderService.downloadDataFile(publicDataPk, savePath);
  }

  private async safeUnlink(p: string) {
    try {
      await fs.unlink(p);
    } catch {}
  }
}
