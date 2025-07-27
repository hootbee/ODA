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
  } {
    const majorCategory = this.extractMajorCategory(prompt);
    const keywords = this.extractKeywords(prompt);
    const searchYear = this.extractYear(prompt);
    const providerAgency = this.extractAgency(prompt);
    const hasDateFilter = this.hasDateRelatedTerms(prompt);

    return {
      majorCategory,
      keywords,
      searchYear,
      providerAgency,
      hasDateFilter,
    };
  }

  /**
   * 프롬프트에서 대분류를 추출합니다.
   */
  private extractMajorCategory(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    const categoryKeywords = {
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
      교통및물류: [
        "교통",
        "도로",
        "지하철",
        "버스",
        "물류",
        "주차",
        "교통사고",
        "신호등",
      ],
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
   * 프롬프트에서 키워드를 추출합니다. (최종 개선된 버전)
   */
  private extractKeywords(prompt: string): string[] {
    // 1단계: 지역명 우선 추출
    const regions: string[] = [
      "서울",
      "서울특별시",
      "부산",
      "부산광역시",
      "대구",
      "대구광역시",
      "인천",
      "인천광역시",
      "광주",
      "광주광역시",
      "대전",
      "대전광역시",
      "울산",
      "울산광역시",
      "세종",
      "세종특별자치시",
      "경기",
      "경기도",
      "강원",
      "강원도",
      "충북",
      "충청북도",
      "충남",
      "충청남도",
      "전북",
      "전라북도",
      "전남",
      "전라남도",
      "경북",
      "경상북도",
      "경남",
      "경상남도",
      "제주",
      "제주특별자치도",
    ];

    const foundRegions: string[] = [];
    for (const region of regions) {
      if (prompt.includes(region)) {
        const shortName = region.replace(/(광역시|특별시|특별자치시|도)$/, "");
        if (!foundRegions.includes(shortName)) {
          foundRegions.push(shortName);
        }
      }
    }

    // 2단계: 연도 추출
    const yearMatch = prompt.match(/(\d{4})/);
    const extractedYear: string | null = yearMatch ? yearMatch[1] : null;

    // 3단계: 주요 키워드 추출 (데이터 제외)
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
      "자료", // ⭐ 너무 일반적인 단어들 추가
    ];

    const cleanedPrompt = prompt
      .replace(/[의가을를에서와과년]/g, " ")
      .replace(/[^\w\s가-힣]/g, " ");

    const mainKeywords: string[] = cleanedPrompt
      .split(/\s+/)
      .filter((word) => word.length > 1 && !stopWords.includes(word))
      .filter((word) => !foundRegions.some((region) => word.includes(region)))
      .filter((word) => !/^\d{4}$/.test(word))
      .slice(0, 2);

    // 4단계: 결과 조합
    const result: string[] = [];
    if (extractedYear) result.push(extractedYear);
    result.push(...foundRegions);
    result.push(...mainKeywords);

    const finalResult = result.slice(0, 3);

    console.log(`개선된 결과: ${finalResult}`);

    return finalResult;
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
