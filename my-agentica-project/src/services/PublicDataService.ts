// services/PublicDataService.ts
import { HybridQueryPlannerService } from "./HybridQueryPlannerService";
import { DataUtilizationService } from "./DataUtilizationService";
import { DataDownloaderService } from "./DataDownloaderService"; // 새로 분리된 다운로더 서비스를 import

export class PublicDataService {
  private readonly queryPlanner = new HybridQueryPlannerService();
  private readonly utilizationService = new DataUtilizationService();
  private readonly downloaderService = new DataDownloaderService(); // 다운로더 인스턴스 생성

  /**
   * 하이브리드 쿼리 계획 생성 (Agentica 호환)
   */
  public async createQueryPlan(input: { prompt: string }): Promise<any> {
    return await this.queryPlanner.createQueryPlan(input.prompt);
  }

  /**
   * 후보 데이터를 추천합니다.
   */
  public async recommendData(input: {
    prompt: string;
    candidates: string[];
  }): Promise<{ recommendations: string[] }> {
    const { prompt, candidates } = input;
    const queryPlan = await this.queryPlanner.createQueryPlan(prompt);
    const filtered = await this.filterByRelevance(
      prompt,
      candidates,
      queryPlan.majorCategory
    );
    const finalRecommendations = filtered.slice(0, queryPlan.limit);
    return { recommendations: finalRecommendations };
  }

  /**
   * AI 기반 관련성 필터링
   */
  private async filterByRelevance(
    prompt: string,
    candidates: string[],
    majorCategory: string
  ): Promise<string[]> {
    const lowerPrompt = prompt.toLowerCase();
    const queryPlan = await this.queryPlanner.createQueryPlan(prompt);
    const promptTokens = queryPlan.keywords;
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

  /**
   * 관련성 점수 계산 (개선된 버전)
   */
  private calculateRelevanceScore(
    candidate: string,
    promptTokens: string[],
    majorCategory: string,
    originalPrompt: string
  ): number {
    const lowerCandidate = candidate.toLowerCase();
    let score = 0;
    promptTokens.forEach((token) => {
      if (lowerCandidate.includes(token.toLowerCase())) score += 15;
    });
    if (lowerCandidate.includes(majorCategory.toLowerCase())) score += 25;
    const candidateTokens = lowerCandidate.split(/[\s_-]+/);
    promptTokens.forEach((token) => {
      if (candidateTokens.includes(token.toLowerCase())) score += 10;
    });
    if (candidate.length > 100) score -= 10;
    else if (candidate.length < 20) score -= 5;
    const specialKeywords = ["최신", "신규", "업데이트", "개선"];
    specialKeywords.forEach((keyword) => {
      if (
        originalPrompt.includes(keyword) &&
        lowerCandidate.includes(keyword)
      ) {
        score += 5;
      }
    });
    return Math.max(0, score);
  }

  /**
   * 데이터 활용 추천 생성
   */
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

  /**
   * 단일 데이터 활용 추천 생성
   */
  public async generateSingleUtilizationRecommendation(input: {
    dataInfo: any;
    analysisType: string;
  }) {
    return this.utilizationService.generateSingleRecommendation(
      input.dataInfo,
      input.analysisType
    );
  }

  /**
   * publicDataPk를 이용해 파일을 다운로드합니다. (다운로더 서비스 호출)
   */
  public async downloadFileByPk(
    publicDataPk: string,
    savePath: string
  ): Promise<void> {
    console.log(`[PublicDataService] 파일 다운로드 요청: PK=${publicDataPk}`);
    return this.downloaderService.downloadDataFile(publicDataPk, savePath);
  }
}
