import { QueryPlannerService } from './QueryPlannerService';

/**
 * 공공데이터 추천 서비스
 */
export class PublicDataService {
  private readonly queryPlanner = new QueryPlannerService();

  /**
   * 프롬프트를 분석하여 DB 쿼리 계획을 생성합니다.
   */
  public async createQueryPlan(input: { prompt: string }): Promise<any> {
    return this.queryPlanner.createQueryPlan(input.prompt);
  }

  /**
   * 후보 데이터를 추천합니다.
   */
  public async recommendData(input: {
    prompt: string;
    candidates: string[];
  }): Promise<{ recommendations: string[] }> {
    const { prompt, candidates } = input;
    const queryPlan = this.queryPlanner.createQueryPlan(prompt);

    // AI 기반 관련성 필터링
    const filtered = this.filterByRelevance(
      prompt,
      candidates,
      queryPlan.majorCategory
    );

    // 최종 3-5개 추천
    const finalRecommendations = filtered.slice(0, 5);

    return {
      recommendations: finalRecommendations,
    };
  }

  /**
   * AI 기반 관련성 필터링
   */
  private filterByRelevance(
    prompt: string,
    candidates: string[],
    majorCategory: string
  ): string[] {
    const lowerPrompt = prompt.toLowerCase();
    const promptTokens = this.queryPlanner.createQueryPlan(prompt).keywords;

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
}