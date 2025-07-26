/**
 * 공공데이터 검색 및 추천 서비스 (다단계 필터링)
 */
export class PublicDataService {
  // 정의된 대분류 체계
  private readonly majorCategories = [
    "지역개발",
    "교육",
    "일반공공행정",
    "재정·세제·금융",
    "환경",
    "농림",
    "사회복지",
    "산업·통상·중소기업",
    "보건",
    "문화체육관광",
    "국토·지역개발",
    "교통및물류",
    "과학기술",
  ];

  /**
   * 검색 파라미터 추출 (대분류 중심)
   */
  async searchData(input: { prompt: string }): Promise<{
    searchYear: number | null;
    title: string;
    keywords: string;
    classificationSystem: string;
    providerAgency: string;
    majorCategory: string; // 추가: 대분류
    hasDateFilter: boolean; // 추가: 날짜 필터 여부
  }> {
    const { prompt } = input;
    const majorCategory = this.extractMajorCategory(prompt);

    return {
      searchYear: this.extractYear(prompt),
      title: this.extractTitle(prompt),
      keywords: prompt,
      classificationSystem: this.classifySystem(prompt),
      providerAgency: this.extractAgency(prompt),
      majorCategory: majorCategory,
      hasDateFilter: this.hasDateRelatedTerms(prompt),
    };
  }

  /**
   * 다단계 데이터 추천
   */
  async recommendData(input: {
    prompt: string;
    category: string;
    candidates: string[];
  }): Promise<{
    recommendations: string[];
    filteringSteps: {
      step1_majorCategory: string;
      step2_dateFiltered: boolean;
      step3_finalCount: number;
    };
  }> {
    const { prompt, category, candidates } = input;

    // 1단계: 대분류 추출
    const majorCategory = this.extractMajorCategory(prompt);

    // 2단계: 날짜 관련 프롬프트 확인
    const hasDateFilter = this.hasDateRelatedTerms(prompt);
    const dateInfo = this.extractDateInfo(prompt);

    // 3단계: AI 기반 관련성 필터링
    const filtered = this.filterByRelevance(prompt, candidates, majorCategory);

    // 최종 3-5개 추천
    const finalRecommendations = filtered.slice(0, 5);

    return {
      recommendations: finalRecommendations,
      filteringSteps: {
        step1_majorCategory: majorCategory,
        step2_dateFiltered: hasDateFilter,
        step3_finalCount: finalRecommendations.length,
      },
    };
  }

  // === 새로운 헬퍼 메서드들 ===

  /**
   * 프롬프트에서 대분류 추출
   */
  private extractMajorCategory(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();

    // 키워드 매핑
    const categoryKeywords = {
      문화체육관광: ["문화재", "관광", "체육", "문화", "박물관", "공연"],
      환경: ["환경", "대기", "수질", "폐기물", "오염", "녹지"],
      교통및물류: ["교통", "도로", "지하철", "버스", "물류", "주차"],
      교육: ["교육", "학교", "대학", "학습", "도서관", "연구"],
      보건: ["보건", "병원", "의료", "건강", "질병", "의약"],
      사회복지: ["복지", "어린이", "노인", "장애", "저소득", "돌봄"],
      "산업·통상·중소기업": [
        "산업",
        "기업",
        "창업",
        "경제",
        "무역",
        "중소기업",
      ],
      일반공공행정: ["행정", "민원", "공무원", "정책", "규제", "법령"],
      "재정·세제·금융": ["재정", "세금", "금융", "예산", "투자", "경제"],
      지역개발: ["개발", "도시", "지역", "건설", "인프라", "택지"],
      농림: ["농업", "임업", "농산물", "산림", "축산", "어업"],
    };

    // 키워드 매칭으로 대분류 찾기
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => lowerPrompt.includes(keyword))) {
        return category;
      }
    }

    return "일반공공행정"; // 기본값
  }

  /**
   * 날짜 관련 용어 확인
   */
  private hasDateRelatedTerms(prompt: string): boolean {
    const dateTerms = [
      "최근",
      "최신",
      "2024",
      "2025",
      "작년",
      "올해",
      "최근",
      "업데이트",
      "갱신",
      "신규",
      "새로운",
      "최근 몇 년",
    ];

    return dateTerms.some((term) => prompt.includes(term));
  }

  /**
   * 날짜 정보 추출
   */
  private extractDateInfo(prompt: string): {
    year?: number;
    isRecent: boolean;
  } {
    const yearMatch = prompt.match(/(\d{4})/);
    const isRecent = prompt.includes("최근") || prompt.includes("최신");

    return {
      year: yearMatch ? parseInt(yearMatch[1]) : undefined,
      isRecent,
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
    const promptTokens = lowerPrompt.split(/\s+/);

    return candidates
      .map((candidate) => ({
        name: candidate,
        score: this.calculateRelevanceScore(
          candidate,
          promptTokens,
          majorCategory
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.name);
  }

  /**
   * 관련성 점수 계산
   */
  private calculateRelevanceScore(
    candidate: string,
    promptTokens: string[],
    majorCategory: string
  ): number {
    const lowerCandidate = candidate.toLowerCase();
    let score = 0;

    // 1. 프롬프트 토큰 매칭 (각 토큰당 10점)
    promptTokens.forEach((token) => {
      if (lowerCandidate.includes(token)) {
        score += 10;
      }
    });

    // 2. 대분류 관련성 (20점)
    if (lowerCandidate.includes(majorCategory.toLowerCase())) {
      score += 20;
    }

    // 3. 길이 패널티 (너무 긴 이름은 점수 감소)
    if (candidate.length > 50) {
      score -= 5;
    }

    return score;
  }

  // === 기존 메서드들 (수정됨) ===

  private classifySystem(prompt: string): string {
    const majorCategory = this.extractMajorCategory(prompt);

    // 대분류에 따른 세부 분류 반환
    const subCategories = {
      문화체육관광: "문화체육관광-문화재",
      환경: "환경-상하수도·수질",
      교통및물류: "교통및물류-도로",
      교육: "교육-교육일반",
      보건: "보건-보건의료",
      사회복지: "사회복지-사회복지일반",
    };

    return subCategories[majorCategory] || `${majorCategory}-기타`;
  }

  private extractTitle(prompt: string): string {
    const majorCategory = this.extractMajorCategory(prompt);
    return majorCategory;
  }

  // 나머지 기존 메서드들은 동일...
  private extractYear(prompt: string): number | null {
    const yearMatch = prompt.match(/(\d{4})/);
    return yearMatch ? parseInt(yearMatch[1]) : null;
  }

  private extractAgency(prompt: string): string {
    if (prompt.includes("인천")) return "인천광역시서구";
    if (prompt.includes("대구")) return "대구광역시서구";
    if (prompt.includes("서울")) return "서울특별시";
    return "기타기관";
  }
}
