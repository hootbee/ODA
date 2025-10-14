// services/HybridQueryPlannerService.ts
import type { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * 하이브리드 쿼리 플래너
 * - 1) 규칙 기반(백엔드 Spring) 결과를 가져오고
 * - 2) 필요 시 LLM으로 보완(JSON만 반환하도록 강제)
 */
export class HybridQueryPlannerService {
  constructor(
      private readonly llm: GoogleGenerativeAI,
      private readonly model: string
  ) {
    if (!llm || !model) throw new Error("HybridQueryPlannerService requires { llm, model }");
  }

  /**
   * 하이브리드 쿼리 계획 생성 (상세 로깅 포함)
   */
  public async createQueryPlan(prompt: string) {
    console.log(`\n[AI-Only Mode] 쿼리 분석 시작: "${prompt}"`);
    console.log("=".repeat(60));

    // 규칙 기반 계획을 건너뛰고, 기본 빈 계획으로 시작합니다.
    const initialPlan = this.getDefaultPlan();
    console.log("⚡ 규칙 기반을 건너뛰고 항상 AI를 통해 계획을 생성합니다.");

    // 항상 AI 보완을 실행
    const enhancedPlan = await this.enhanceWithAI(prompt, initialPlan);

    console.log(`\n✨ AI 처리 완료:`);
    console.log(`   카테고리: ${enhancedPlan.majorCategory}`);
    console.log(`   키워드: [${(enhancedPlan.keywords || []).join(", ")}]`);
    console.log("=".repeat(60));
    
    return enhancedPlan;
  }

  /**
   * AI 보완 필요성 휴리스틱
   */
  private needsAIEnhancement(prompt: string, ruleBasedPlan: any): boolean {
    const complexPatterns = [
      /(?:관련.*있는|연관.*된|비슷한|유사한)/, // 복잡한 자연어
      /(?:아닌|제외|빼고|말고)/,               // 부정
      /(?:만약|경우|때|상황)/,                 // 조건
      /(?:비교|대비|차이|vs)/,                 // 비교
      /(?:효과적|최적|개선|혁신|트렌드)/,       // 추상
    ];
    const hasComplexPattern = complexPatterns.some((p) => p.test(prompt));
    const hasLowConfidence = !ruleBasedPlan?.keywords || ruleBasedPlan.keywords.length < 2;
    const isLongQuery = prompt.length > 50;

    return hasComplexPattern || hasLowConfidence || isLongQuery;
  }

  /**
   * 왜 보완이 필요한지 로깅용 상세 사유
   */
  private getAIEnhancementReasons(prompt: string, ruleBasedPlan: any): string[] {
    const reasons: string[] = [];
    if (!ruleBasedPlan?.keywords || ruleBasedPlan.keywords.length < 2) {
      reasons.push(`키워드 부족 (${(ruleBasedPlan.keywords || []).length}개)`);
    }
    if (prompt.length > 50) reasons.push(`긴 쿼리 (${prompt.length}자)`);

    const complexPatterns = [
      { pattern: /(?:관련.*있는|연관.*된|비슷한|유사한)/, name: "관련성 표현" },
      { pattern: /(?:아닌|제외|빼고|말고)/, name: "부정 표현" },
      { pattern: /(?:만약|경우|때|상황)/, name: "조건부 표현" },
      { pattern: /(?:비교|대비|차이|vs)/, name: "비교 표현" },
      { pattern: /(?:효과적|최적|개선|혁신|트렌드)/, name: "추상적 개념" },
    ];
    complexPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(prompt)) reasons.push(name);
    });

    return reasons;
  }

  /**
   * LLM으로 쿼리 계획 보완 (Gemini JSON 모드)
   * - 응답은 "반드시 JSON"만 반환하도록 강제
   */
  private async enhanceWithAI(prompt: string, ruleBasedPlan: any) {
    try {
      const enhancementPrompt = this.buildEnhancementPrompt(prompt, ruleBasedPlan);
      const jsonText = await this.chatJSON(enhancementPrompt);
      const enhanced = this.parseEnhancedPlan(jsonText, ruleBasedPlan);
      return enhanced;
    } catch (error) {
      console.error("AI 보완 실패, 규칙 기반 결과 사용:", error);
      return ruleBasedPlan;
    }
  }

  /**
   * 프롬프트: 규칙 기반 결과를 개선한 JSON 객체만 반환하도록 지시
   */
  private buildEnhancementPrompt(prompt: string, ruleBasedPlan: any): string {
    const allowedKeywords = [
      // 보건
      "보건", "의료", "병원", "건강", "질병", "감염병", "코로나", "백신", "의약", "검진", "진료", "미용", "위생",
      // 문화/관광
      "문화", "관광", "축제", "전시", "공연", "예술", "박물관", "문화재", "체육", "여행", "명소",
      // 산업/경제
      "산업", "경제", "기업", "창업", "제조", "무역", "고용", "중소기업", "시장", "소비", "투자", "금융",
      // 복지
      "복지", "사회복지", "돌봄", "노인", "아동", "장애인", "저소득", "보육", "생활지원", "복지관",
      // 환경
      "환경", "대기", "수질", "오염", "폐기물", "기후", "탄소", "생태", "미세먼지", "에너지", "녹지",
      // 교육
      "교육", "학교", "대학", "학생", "교사", "학습", "연구", "도서관", "교과", "평가",
      // 일반행정
      "행정", "정책", "민원", "공무원", "정부", "자치", "법령", "시청", "구청", "제도",
      // 교통
      "교통", "도로", "버스", "지하철", "철도", "신호등", "주차", "교통안전", "교통사고", "물류", "대중교통",
      // 인구/가구
      "인구", "가구", "출생", "사망", "인구통계", "이동", "통계", "세대", "인구수", "연령대",
      // 안전
      "안전", "재난", "재해", "방재", "방범", "치안", "응급", "소방", "사고", "대피", "위험",
      // 도시관리
      "도시", "지역", "개발", "도시계획", "시설", "도로관리", "조경", "인프라", "구역", "공원",
      // 주택/건설
      "주택", "건설", "부동산", "재개발", "건축", "아파트", "임대", "주거", "토지", "건축물",
      // 지역 (서울)
      "서울", "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구", "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구", "양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구", "서초구", "강남구", "송파구", "강동구",
      "종로", "중구청", "용산", "성동", "광진", "동대문", "중랑", "성북", "강북", "도봉", "노원", "은평", "서대문", "마포", "양천", "목동", "강서", "구로", "금천", "영등포", "여의도", "동작", "관악", "봉천", "서초", "방배", "잠원", "강남", "삼성동", "역삼동", "논현동", "청담동", "압구정", "대치동", "개포동", "수서동", "일원동", "신사동", "송파", "잠실", "문정동", "가락동", "오금동", "강동", "천호", "둔촌"
    ];
    const allowedCategories = [
      "교통", "안전", "환경", "복지", "문화/관광", "보건", "산업/경제", "교육", "일반행정", "인구/가구", "도시관리", "주택/건설"
    ];

    return `
당신은 서울시 공공데이터 검색을 위한 쿼리 플래너입니다. 사용자의 프롬프트를 분석하여 검색에 가장 적합한 JSON 쿼리 계획을 생성해야 합니다.

원본 사용자 프롬프트: ${JSON.stringify(prompt)}

다음 요구사항을 반드시 만족하세요:
1.  **키워드(keywords) 생성**:
    -   사용자 프롬프트의 핵심 의도를 파악하여 관련 키워드를 6~10개 생성합니다.
    -   **중요**: 생성하는 모든 키워드는 반드시 아래 '허용된 키워드 목록'에 있는 단어 중에서만 선택해야 합니다. 목록에 없는 단어는 절대 사용하지 마세요.
    -   **중요**: 사용자 프롬프트에 '마포', '강남구' 같은 지역명이 있으면, 반드시 그 지역명을 'keywords' 배열의 첫 번째 요소로 포함시키세요.

2.  **카테고리(majorCategory) 선택**:
    -   생성된 키워드와 사용자 프롬프트의 전체적인 맥락에 가장 적합한 카테고리 1개를 아래 '허용된 카테고리 목록'에서 선택하세요.

3.  **검색 전략(searchYear, providerAgency, hasDateFilter, limit) 조정**:
    -   사용자 프롬프트에 연도, 기관명, 날짜 관련 표현이 있으면 그에 맞게 값을 설정하세요. 없으면 기본값을 사용하세요.

---
[허용된 키워드 목록]
${[...new Set(allowedKeywords)].join(", ")}

[허용된 카테고리 목록]
${allowedCategories.join(", ")}
---

응답은 반드시 아래 JSON 객체 포맷으로만 반환하고, 다른 설명은 절대 추가하지 마세요:
{
  "majorCategory": "위 '허용된 카테고리 목록' 중 하나",
  "keywords": ["위 '허용된 키워드 목록'에서만 선택", "..."],
  "searchYear": 2024 | null,
  "providerAgency": "기관명 또는 '기타기관'",
  "hasDateFilter": true/false,
  "limit": 10
}
  `.trim();
  }  /**
   * LLM 호출 (항상 JSON만 오도록 강제)
   */
  private async chatJSON(prompt: string): Promise<string> {
    const model = this.llm.getGenerativeModel({
      model: this.model,
      systemInstruction:
          "You are a helpful planner that ALWAYS returns pure JSON with no markdown, no extra text. Output must be a single JSON object.",
    });

    const resp = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }]}],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json", // ✅ JSON 모드 강제
      },
    });

    return resp.response.text() ?? "{}";
  }

  /**
   * JSON 정제 (코드펜스/잡텍스트 제거 후 객체만 남김)
   */
  private cleanJsonObject(response: string): string {
    let cleaned = response.replace(/```(?:json)?|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.substring(start, end + 1);
    }
    return cleaned;
  }

  /**
   * AI가 돌려준 보완 결과 파싱
   */
  private parseEnhancedPlan(response: string, fallback: any) {
    try {
      const cleaned = this.cleanJsonObject(response);
      const enhanced = JSON.parse(cleaned);

      const merged = {
        majorCategory: enhanced.majorCategory || fallback.majorCategory || "일반공공행정",
        keywords: Array.isArray(enhanced.keywords) ? enhanced.keywords : fallback.keywords || [],
        searchYear:
            typeof enhanced.searchYear === "number" ? enhanced.searchYear : fallback.searchYear ?? null,
        providerAgency: enhanced.providerAgency || fallback.providerAgency || "기타기관",
        hasDateFilter:
            typeof enhanced.hasDateFilter === "boolean"
                ? enhanced.hasDateFilter
                : fallback.hasDateFilter ?? false,
        limit: typeof enhanced.limit === "number" ? enhanced.limit : fallback.limit || 10,
        isAIEnhanced: true,
      };

      merged.majorCategory = String(merged.majorCategory).replace(/\s+/g, "");
      merged.keywords = (merged.keywords as string[]).map((k) => k?.trim()).filter(Boolean);

      return merged;
    } catch (error) {
      console.error("AI 응답 파싱 실패:", error);
      return { ...fallback, isAIEnhanced: false };
    }
  }

  /**
   * 규칙 기반 플랜: Spring 백엔드에서 가져오기
   */
  private async fetchRuleBasedPlan(prompt: string): Promise<any> {
    try {
      const response = await fetch("http://backend:8080/api/query-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("규칙 기반 쿼리 계획을 가져오는 데 실패했습니다:", error);
      return this.getDefaultPlan();
    }
  }

  private getDefaultPlan() {
    return {
      majorCategory: "일반공공행정",
      keywords: ["기본"],
      searchYear: null,
      providerAgency: "기타기관",
      hasDateFilter: false,
      limit: 10,
      isAIEnhanced: false,
    };
  }
}