/**
 * 사용자의 프롬프트를 분석하여 DB 쿼리에 사용할 수 있는 "쿼리 계획"을 생성합니다.
 */
export class QueryPlannerService {
  // 정의된 대분류 체계
  private readonly majorCategories = [
    "일반공공행정",
    "사회복지",
    "문화체육관광",
    "교육",
    "환경",
    "산업·통상·중소기업",
    "보건",
    "농림",
    "지역개발",
    "교통및물류",
    "재정·세제·금융",
    "공공질서및안전",
    "과학기술",
    "통신",
  ];

  /**
   * 프롬프트를 분석하여 쿼리 계획을 생성합니다.
   */
  public createQueryPlan(prompt: string): {
    majorCategory: string;
    keywords: string[];
    searchYear: number | null;
    providerAgency: string;
    hasDateFilter: boolean;
    limit: number;
  } {
    const majorCategory = this.extractMajorCategory(prompt);
    const keywords = this.extractKeywords(prompt);
    const searchYear = this.extractYear(prompt);
    const providerAgency = this.extractAgency(prompt);
    const hasDateFilter = this.hasDateRelatedTerms(prompt);
    const limit = this.extractLimit(prompt);

    return {
      majorCategory,
      keywords,
      searchYear,
      providerAgency,
      hasDateFilter,
      limit,
    };
  }

  /**
   * 프롬프트에서 결과 개수 제한을 추출합니다.
   */
  private extractLimit(prompt: string): number {
    const lowerPrompt = prompt.toLowerCase();

    // "n개" 형식 숫자 추출
    const countMatch = prompt.match(/(\d+)\s*개/);
    if (countMatch && countMatch[1]) {
      const count = parseInt(countMatch[1], 10);
      if (!isNaN(count)) {
        return count;
      }
    }

    if (lowerPrompt.includes("많이")) {
      return 20;
    }

    if (lowerPrompt.includes("간단히") || lowerPrompt.includes("요약")) {
      return 5;
    }

    // 기본값
    return 12;
  }

  /**
   * 프롬프트에서 대분류를 추출합니다.
   */
  private extractMajorCategory(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    const categoryKeywords = {
      교통및물류: [
        "교통",
        "도로",
        "지하철",
        "버스",
        "물류",
        "주차",
        "교통사고",
        "신호등",
        "교통안전",
        "도로안전",
        "사고예방",
      ],
      공공질서및안전: [
        "안전",
        "보안",
        "방범",
        "치안",
        "안전사고",
        "시민안전",
        "공공안전",
        "생활안전",
      ],
      문화체육관광: [
        "문화재",
        "관광",
        "체육",
        "문화",
        "박물관",
        "공연",
        "축제",
        "예술",
      ],
      환경: ["환경", "대기", "수질", "폐기물", "오염", "녹지", "생태", "기후"],
      교육: ["교육", "학교", "대학", "학습", "도서관", "연구", "학생", "교사"],
      보건: ["보건", "병원", "의료", "건강", "질병", "의약", "코로나", "백신"],
      사회복지: [
        "복지",
        "어린이",
        "노인",
        "장애",
        "저소득",
        "돌봄",
        "보육",
        "복지관",
      ],
      "산업·통상·중소기업": [
        "산업",
        "기업",
        "창업",
        "경제",
        "무역",
        "중소기업",
        "공장",
        "제조업",
      ],
      일반공공행정: [
        "행정",
        "민원",
        "공무원",
        "정책",
        "규제",
        "법령",
        "시청",
        "구청",
      ],
      "재정·세제·금융": [
        "재정",
        "세금",
        "금융",
        "예산",
        "투자",
        "경제",
        "세무",
        "은행",
      ],
      지역개발: [
        "개발",
        "도시",
        "지역",
        "건설",
        "인프라",
        "택지",
        "재개발",
        "도시계획",
      ],
      농림: ["농업", "임업", "농산물", "산림", "축산", "어업", "농가", "농촌"],
    };

    let bestMatch = "일반공공행정";
    let highestScore = 0;

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      const score = keywords.reduce(
        (acc, keyword) => acc + (lowerPrompt.includes(keyword) ? 1 : 0),
        0
      );
      if (score > highestScore) {
        highestScore = score;
        bestMatch = category;
      }
    }
    return bestMatch;
  }

  /**
   * 프롬프트에서 키워드를 추출합니다. (개선된 버전)
   */
  private extractKeywords(prompt: string): string[] {
    console.log(`🔍 원본 프롬프트: "${prompt}"`);

    // 1단계: 도메인 특화 키워드 우선 추출
    const domainKeywords = this.extractDomainKeywords(prompt);
    console.log(`🎯 도메인 키워드: ${domainKeywords}`);

    // 2단계: 지역명 추출
    const regions = this.extractRegions(prompt);
    console.log(`📍 지역명: ${regions}`);

    // 3단계: 연도 추출
    const years = this.extractYears(prompt);
    console.log(`📅 연도: ${years}`);

    // 4단계: 일반 키워드 추출 (도메인 키워드가 부족할 때만)
    let generalKeywords: string[] = [];
    if (domainKeywords.length < 2) {
      generalKeywords = this.extractGeneralKeywords(prompt, [
        ...domainKeywords,
        ...regions,
      ]);
      console.log(`💭 일반 키워드: ${generalKeywords}`);
    }

    // 5단계: 우선순위별 결합
    const result: string[] = [];
    result.push(...domainKeywords.slice(0, 2)); // 도메인 키워드 최우선
    result.push(...years.slice(0, 1)); // 연도 1개
    result.push(...regions.slice(0, 1)); // 지역 1개
    result.push(...generalKeywords.slice(0, 1)); // 일반 키워드 1개

    const finalResult = result.slice(0, 4);
    console.log(`✅ 최종 키워드: ${finalResult}`);

    return finalResult;
  }

  /**
   * 도메인 특화 키워드 추출 (새로 추가)
   */
  private extractDomainKeywords(prompt: string): string[] {
    const domainPatterns = [
      // 교통 관련
      {
        keywords: ["교통", "교통사고", "교통안전", "도로안전", "사고예방"],
        category: "교통",
      },
      // 안전 관련
      {
        keywords: ["안전", "보안", "방범", "치안", "안전사고"],
        category: "안전",
      },
      // 프로젝트/연구 관련
      {
        keywords: ["프로젝트", "연구", "분석", "조사", "개발"],
        category: "연구",
      },
      // 시민/공공 관련
      {
        keywords: ["시민", "주민", "시민안전", "공공안전", "생활안전"],
        category: "시민",
      },
      // 환경 관련
      {
        keywords: ["환경", "대기질", "수질", "오염", "기후"],
        category: "환경",
      },
      // 문화/관광 관련
      {
        keywords: ["문화", "관광", "축제", "문화재", "박물관"],
        category: "문화",
      },
      // 복지 관련
      {
        keywords: ["복지", "돌봄", "보육", "노인", "장애인"],
        category: "복지",
      },
      // 공공데이터 관련
      {
        keywords: ["공공데이터", "데이터", "정보", "자료"],
        category: "데이터",
      },
    ];

    const found: string[] = [];
    const lowerPrompt = prompt.toLowerCase();

    for (const pattern of domainPatterns) {
      for (const keyword of pattern.keywords) {
        if (lowerPrompt.includes(keyword.toLowerCase())) {
          if (!found.includes(keyword)) {
            found.push(keyword);
          }
        }
      }
    }

    return found;
  }

  /**
   * 지역명 추출 (기존 로직 분리)
   */
  private extractRegions(prompt: string): string[] {
    const regions: string[] = [
      "서울",
      "부산",
      "대구",
      "인천",
      "광주",
      "대전",
      "울산",
      "세종",
      "경기",
      "강원",
      "충북",
      "충남",
      "전북",
      "전남",
      "경북",
      "경남",
      "제주",
    ];

    const found: string[] = [];
    for (const region of regions) {
      if (prompt.includes(region)) {
        if (!found.includes(region)) {
          found.push(region);
        }
      }
    }

    return found;
  }

  /**
   * 연도 추출 (기존 로직 분리)
   */
  private extractYears(prompt: string): string[] {
    const yearMatch = prompt.match(/(\d{4})/g);
    if (yearMatch) {
      return yearMatch.filter((year) => {
        const y = parseInt(year);
        return y >= 2000 && y <= 2030;
      });
    }
    return [];
  }

  /**
   * 일반 키워드 추출 (개선된 버전)
   */
  private extractGeneralKeywords(
    prompt: string,
    excludeWords: string[]
  ): string[] {
    // 개선된 불용어 리스트
    const stopWords: string[] = [
      "관련",
      "대한",
      "있는",
      "그",
      "이",
      "저",
      "것",
      "에",
      "를",
      "와",
      "과",
      "의",
      "년",
      "데이터",
      "정보",
      "자료",
      "나는",
      "내가",
      "우리",
      "어떤",
      "어느",
      "무엇",
      "뭐",
      "하기",
      "위해서",
      "하려면",
      "하고있어",
      "찾고있어",
      "좋을까",
      "것이",
      "것을",
    ];

    const cleanedPrompt = prompt
      .replace(/[의가을를에서와과년]/g, " ")
      .replace(/[^\w\s가-힣]/g, " ");

    const words = cleanedPrompt
      .split(/\s+/)
      .filter((word) => word.length >= 2)
      .filter((word) => !stopWords.includes(word))
      .filter(
        (word) => !excludeWords.some((excluded) => word.includes(excluded))
      )
      .filter((word) => this.isValidKeyword(word));

    return words.slice(0, 3);
  }

  /**
   * 키워드 유효성 검증
   */
  private isValidKeyword(word: string): boolean {
    // 너무 일반적인 단어 제외
    const commonWords = ["관련", "현황", "정보", "시설", "업체", "목록"];
    if (commonWords.includes(word)) return false;

    // 의미있는 명사나 전문용어인지 확인
    return word.length >= 2 && /[가-힣]/.test(word);
  }

  /**
   * 프롬프트에서 연도를 추출합니다.
   */
  private extractYear(prompt: string): number | null {
    const yearMatch = prompt.match(/(\d{4})/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      if (year >= 2000 && year <= 2030) {
        return year;
      }
    }
    const currentYear = new Date().getFullYear();
    if (prompt.includes("작년")) return currentYear - 1;
    if (prompt.includes("올해") || prompt.includes("금년")) return currentYear;
    if (prompt.includes("최근") || prompt.includes("최신")) return currentYear;
    return null;
  }

  /**
   * 프롬프트에서 제공 기관을 추출합니다.
   */
  private extractAgency(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    const agencies: { [key: string]: string } = {
      인천: "인천광역시서구",
      대구: "대구광역시서구",
      서울: "서울특별시",
      부산: "부산광역시",
      대전: "대전광역시",
      광주: "광주광역시",
      울산: "울산광역시",
      세종: "세종특별자치시",
      경기: "경기도",
      강원: "강원도",
      충북: "충청북도",
      충남: "충청남도",
      전북: "전라북도",
      전남: "전라남도",
      경북: "경상북도",
      경남: "경상남도",
      제주: "제주특별자치도",
    };

    for (const [keyword, agency] of Object.entries(agencies)) {
      if (lowerPrompt.includes(keyword)) {
        return agency;
      }
    }
    return "기타기관";
  }

  /**
   * 날짜 관련 용어가 있는지 확인합니다.
   */
  private hasDateRelatedTerms(prompt: string): boolean {
    const dateTerms = [
      "최근",
      "최신",
      "2023",
      "2024",
      "2025",
      "작년",
      "올해",
      "업데이트",
      "갱신",
      "신규",
      "새로운",
      "최근 몇 년",
      "최근 몇개월",
    ];
    return dateTerms.some((term) => prompt.includes(term));
  }
}
