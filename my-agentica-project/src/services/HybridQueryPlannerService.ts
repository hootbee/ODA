// services/HybridQueryPlannerService.ts
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { QueryPlannerService } from "./QueryPlannerService";

export class HybridQueryPlannerService {
  private ruleBasedPlanner = new QueryPlannerService();
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
   * 하이브리드 쿼리 계획 생성
   * 1단계: 규칙 기반으로 빠른 기본 계획 생성
   * 2단계: 복잡한 경우에만 AI로 보완
   */
  public async createQueryPlan(prompt: string) {
    // 1단계: 규칙 기반 빠른 처리
    const ruleBasedPlan = this.ruleBasedPlanner.createQueryPlan(prompt);

    // 2단계: AI 보완이 필요한지 판단
    if (this.needsAIEnhancement(prompt, ruleBasedPlan)) {
      console.log("🤖 복잡한 쿼리 감지 - AI 보완 적용");
      return await this.enhanceWithAI(prompt, ruleBasedPlan);
    }

    console.log("⚡ 규칙 기반 처리 완료");
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
   * AI로 쿼리 계획 보완
   */
  private async enhanceWithAI(prompt: string, ruleBasedPlan: any) {
    try {
      const enhancementPrompt = `
사용자 쿼리: "${prompt}"
규칙 기반 분석 결과: ${JSON.stringify(ruleBasedPlan)}

위 규칙 기반 결과를 enhance_query_plan 함수를 호출하여 다음 관점에서 개선해주세요:
1. 동의어/유의어를 고려한 키워드 확장
2. 문맥을 고려한 카테고리 재분류  
3. 의도 파악을 통한 검색 전략 개선
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
        responseMimeType: "application/json", // ✅ 수정: response_mime_type → responseMimeType
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
}
