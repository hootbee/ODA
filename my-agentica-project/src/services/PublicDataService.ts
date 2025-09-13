// services/PublicDataService.ts
import { HybridQueryPlannerService } from "./HybridQueryPlannerService";
import { DataUtilizationService } from "./DataUtilizationService";
import { DataDownloaderService } from "./DataDownloaderService";
import type OpenAI from "openai";

type Deps = {
  llm: OpenAI;
  model: string;
};

export class PublicDataService {
  private readonly queryPlanner = new HybridQueryPlannerService();
  private readonly utilizationService: DataUtilizationService;
  private readonly downloaderService = new DataDownloaderService();

  constructor(private readonly deps: Deps) {
    this.utilizationService = new DataUtilizationService(deps.llm, deps.model);
  }

  public async createQueryPlan(input: { prompt: string }): Promise<any> {
    return await this.queryPlanner.createQueryPlan(input.prompt);
  }

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
    analysisType: string;
  }) {
    return this.utilizationService.generateSingleRecommendation(
        input.dataInfo,
        input.analysisType
    );
  }

  public async downloadFileByPk(publicDataPk: string, savePath: string) {
    return this.downloaderService.downloadDataFile(publicDataPk, savePath);
  }
}
