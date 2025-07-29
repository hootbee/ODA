// services/HybridQueryPlannerService.ts
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
export class HybridQueryPlannerService {
  // QueryPlannerService는 이제 백엔드에서 처리합니다.

  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      tools: [
        {
          functionDeclarations: [
            {
              name: "enhance_query_plan",
              description: "규칙 기반 쿼리 계획을 AI로 보완하고 개선합니다",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  originalPrompt: {
                    type: SchemaType.STRING,
                    description: "원본 사용자 쿼리",
                  },
                  ruleBasedResult: {
                    type: SchemaType.OBJECT,
                    properties: {
                      majorCategory: { type: SchemaType.STRING },
                      keywords: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                      },
                      searchYear: { type: SchemaType.NUMBER },
                      providerAgency: { type: SchemaType.STRING },
                      hasDateFilter: { type: SchemaType.BOOLEAN },
                      limit: { type: SchemaType.NUMBER },
                    },
                    description: "규칙 기반 분석 결과",
                  },
                  enhancementType: {
                    type: SchemaType.STRING,
                    enum: [
                      "keyword_expansion",
                      "category_refinement",
                      "context_understanding",
                    ],
                    format: "enum",
                    description: "개선 유형",
                  },
                },
                required: ["originalPrompt", "ruleBasedResult"],
              },
            },
          ],
        },
      ],
    });
  }

  /**
   * 하이브리드 쿼리 계획 생성 (상세 로깅 추가)
   */
  public async createQueryPlan(prompt: string) {
    console.log(`\n🔍 하이브리드 쿼리 분석 시작: "${prompt}"`);
    console.log("=".repeat(60));

    // 1단계: 규칙 기반 빠른 처리 (스프링 백엔드 호출)
    const ruleBasedPlan = await this.fetchRuleBasedPlan(prompt);
    console.log(`\n📊 규칙 기반 분석 결과:`);
    console.log(`   카테고리: ${ruleBasedPlan.majorCategory}`);
    console.log(`   키워드: [${ruleBasedPlan.keywords.join(", ")}]`);
    console.log(`   키워드 수: ${ruleBasedPlan.keywords.length}`);

    // 2단계: AI 보완 필요성 판단
    const needsAI = this.needsAIEnhancement(prompt, ruleBasedPlan);
    console.log(
      `\n🤖 AI 보완 필요성 판단: ${needsAI ? "✅ 필요" : "❌ 불필요"}`
    );

    if (needsAI) {
      const reasons = this.getAIEnhancementReasons(prompt, ruleBasedPlan);
      console.log(`   보완 이유: ${reasons.join(", ")}`);

      console.log("🧠 AI 보완 진행 중...");
      const enhanced = await this.enhanceWithAI(prompt, ruleBasedPlan);

      console.log(`\n✨ AI 보완 완료:`);
      console.log(`   개선된 카테고리: ${enhanced.majorCategory}`);
      console.log(`   개선된 키워드: [${enhanced.keywords.join(", ")}]`);
      console.log(
        `   키워드 수 변화: ${ruleBasedPlan.keywords.length} → ${enhanced.keywords.length}`
      );

      console.log("=".repeat(60));
      return enhanced;
    }

    console.log("⚡ 규칙 기반 처리로 충분함");
    console.log("=".repeat(60));
    return ruleBasedPlan;
  }

  /**
   * AI 보완이 필요한지 판단하는 휴리스틱
   */
  private needsAIEnhancement(prompt: string, ruleBasedPlan: any): boolean {
    const complexPatterns = [
      // 복잡한 자연어 패턴
      /(?:관련.*있는|연관.*된|비슷한|유사한)/,
      // 부정 표현
      /(?:아닌|제외|빼고|말고)/,
      // 조건부 표현
      /(?:만약|경우|때|상황)/,
      // 비교 표현
      /(?:비교|대비|차이|vs)/,
      // 추상적 개념
      /(?:효과적|최적|개선|혁신|트렌드)/,
    ];

    const hasComplexPattern = complexPatterns.some((pattern) =>
      pattern.test(prompt)
    );
    const hasLowConfidence = ruleBasedPlan.keywords.length < 2;
    const isLongQuery = prompt.length > 50;

    return hasComplexPattern || hasLowConfidence || isLongQuery;
  }

  /**
   * AI 보완 이유 상세 분석
   */
  private getAIEnhancementReasons(
    prompt: string,
    ruleBasedPlan: any
  ): string[] {
    const reasons: string[] = [];

    if (ruleBasedPlan.keywords.length < 2) {
      reasons.push(`키워드 부족 (${ruleBasedPlan.keywords.length}개)`);
    }

    if (prompt.length > 50) {
      reasons.push(`긴 쿼리 (${prompt.length}자)`);
    }

    const complexPatterns = [
      { pattern: /(?:관련.*있는|연관.*된|비슷한|유사한)/, name: "관련성 표현" },
      { pattern: /(?:아닌|제외|빼고|말고)/, name: "부정 표현" },
      { pattern: /(?:만약|경우|때|상황)/, name: "조건부 표현" },
      { pattern: /(?:비교|대비|차이|vs)/, name: "비교 표현" },
      { pattern: /(?:효과적|최적|개선|혁신|트렌드)/, name: "추상적 개념" },
    ];

    complexPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(prompt)) {
        reasons.push(name);
      }
    });

    return reasons;
  }

  /**
   * AI로 쿼리 계획 보완 (개선된 프롬프트)
   */
  private async enhanceWithAI(prompt: string, ruleBasedPlan: any) {
    try {
      const enhancementPrompt = `
사용자 쿼리: "${prompt}"
규칙 기반 분석 결과: ${JSON.stringify(ruleBasedPlan)}

위 규칙 기반 결과를 enhance_query_plan 함수를 호출하여 다음 관점에서 개선해주세요:

1. 키워드 확장 및 보완:
   - 원본 프롬프트에서 누락된 핵심 키워드 추출
   - 동의어/유의어 추가 (예: "교통안전" → "도로안전", "사고예방")
   - 불필요한 키워드 제거 ("나는", "시민" 등 일반적 용어)

2. 카테고리 정확도 개선:
   - 프롬프트의 실제 의도에 맞는 대분류 재검토
   - 예: "교통안전 프로젝트" → "교통및물류" 또는 "공공질서및안전"

3. 검색 전략 최적화:
   - 키워드 우선순위 조정
   - 검색 범위 및 필터 개선

특히 다음 키워드들이 누락되었는지 확인해주세요:
- "교통", "안전", "프로젝트", "공공데이터" 등 핵심 용어
      `;

      const result = await this.model.generateContent(enhancementPrompt);
      const response = result.response;

      if (response.functionCalls && response.functionCalls().length > 0) {
        return await this.processEnhancement(
          response.functionCalls()[0],
          ruleBasedPlan
        );
      }

      return ruleBasedPlan; // AI 실패시 규칙 기반 결과 반환
    } catch (error) {
      console.error("AI 보완 실패, 규칙 기반 결과 사용:", error);
      return ruleBasedPlan;
    }
  }

  /**
   * AI 보완 결과 처리
   */
  private async processEnhancement(functionCall: any, ruleBasedPlan: any) {
    const enhancedPrompt = `
다음 쿼리 계획을 JSON 형식으로 개선해주세요:
${JSON.stringify(ruleBasedPlan)}

개선 사항:
- 키워드를 동의어/유의어 포함하여 확장
- 카테고리 정확도 향상
- 검색 의도 반영

사용 가능한 대분류:
- 교통및물류
- 공공질서및안전
- 일반공공행정
- 사회복지
- 문화체육관광
- 교육
- 환경
- 산업·통상·중소기업
- 보건
- 농림
- 지역개발
- 재정·세제·금융
- 과학기술
- 통신

JSON 형식으로만 응답해주세요.
    `;

    const detailResult = await this.callGenerativeAI(enhancedPrompt);
    return this.parseEnhancedPlan(detailResult, ruleBasedPlan);
  }

  private async callGenerativeAI(prompt: string): Promise<string> {
    const simpleModel = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });

    const result = await simpleModel.generateContent(prompt);
    return result.response.text();
  }

  private parseEnhancedPlan(response: string, fallback: any) {
    try {
      const enhanced = JSON.parse(response.replace(/``````/g, "").trim());

      // 필수 필드 검증 및 병합
      return {
        majorCategory: enhanced.majorCategory || fallback.majorCategory,
        keywords: Array.isArray(enhanced.keywords)
          ? enhanced.keywords
          : fallback.keywords,
        searchYear: enhanced.searchYear || fallback.searchYear,
        providerAgency: enhanced.providerAgency || fallback.providerAgency,
        hasDateFilter: enhanced.hasDateFilter ?? fallback.hasDateFilter,
        limit: enhanced.limit || fallback.limit,
        isAIEnhanced: true, // AI 보완 여부 표시
      };
    } catch (error) {
      console.error("AI 응답 파싱 실패:", error);
      return { ...fallback, isAIEnhanced: false };
    }
  }

  private async fetchRuleBasedPlan(prompt: string): Promise<any> {
    try {
      const response = await fetch('http://localhost:8080/api/query-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("규칙 기반 쿼리 계획을 가져오는 데 실패했습니다:", error);
      // 에러 발생 시 기본 계획 반환 또는 에러 처리
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
