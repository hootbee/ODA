// services/PublicDataService.ts
import * as fs from "fs";
import * as path from "path";
import { HybridQueryPlannerService } from "./HybridQueryPlannerService";
import { DataUtilizationService } from "./DataUtilizationService";

export class PublicDataService {
  private readonly queryPlanner = new HybridQueryPlannerService();
  private readonly utilizationService = new DataUtilizationService();

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

    // await 추가 - Promise 해결
    const queryPlan = await this.queryPlanner.createQueryPlan(prompt);

    // await 추가 - filterByRelevance도 Promise를 반환하므로
    const filtered = await this.filterByRelevance(
      prompt,
      candidates,
      queryPlan.majorCategory
    );

    // 이제 filtered는 string[] 타입이므로 slice 사용 가능
    const finalRecommendations = filtered.slice(0, queryPlan.limit);

    return {
      recommendations: finalRecommendations,
    };
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

    // await 추가 - Promise 해결
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

    // 1. 프롬프트 토큰 매칭 (각 토큰당 15점)
    promptTokens.forEach((token) => {
      if (lowerCandidate.includes(token.toLowerCase())) {
        score += 15;
      }
    });

    // 2. 대분류 관련성 (25점)
    if (lowerCandidate.includes(majorCategory.toLowerCase())) {
      score += 25;
    }

    // 3. 완전 단어 매칭 보너스 (10점)
    const candidateTokens = lowerCandidate.split(/[\s_-]+/);
    promptTokens.forEach((token) => {
      if (candidateTokens.includes(token.toLowerCase())) {
        score += 10;
      }
    });

    // 4. 길이 기반 패널티/보너스
    if (candidate.length > 100) {
      score -= 10; // 너무 긴 이름 패널티
    } else if (candidate.length < 20) {
      score -= 5; // 너무 짧은 이름 패널티
    }

    // 5. 특수 키워드 보너스
    const specialKeywords = ["최신", "신규", "업데이트", "개선"];
    specialKeywords.forEach((keyword) => {
      if (
        originalPrompt.includes(keyword) &&
        lowerCandidate.includes(keyword)
      ) {
        score += 5;
      }
    });

    return Math.max(0, score); // 음수 점수 방지
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
}
