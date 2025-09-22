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
    console.log(`\n🔍 하이브리드 쿼리 분석 시작: "${prompt}"`);
    console.log("=".repeat(60));

    // 1) 규칙 기반 빠른 처리 (스프링 백엔드 호출)
    const ruleBasedPlan = await this.fetchRuleBasedPlan(prompt);
    console.log(`\n📊 규칙 기반 분석 결과:`);
    console.log(`   카테고리: ${ruleBasedPlan.majorCategory}`);
    console.log(`   키워드: [${(ruleBasedPlan.keywords || []).join(", ")}]`);
    console.log(`   키워드 수: ${(ruleBasedPlan.keywords || []).length}`);

    // 2) AI 보완 필요성 판단
    const needsAI = this.needsAIEnhancement(prompt, ruleBasedPlan);
    console.log(`\n🤖 AI 보완 필요성 판단: ${needsAI ? "✅ 필요" : "❌ 불필요"}`);

    if (needsAI) {
      const reasons = this.getAIEnhancementReasons(prompt, ruleBasedPlan);
      console.log(`   보완 이유: ${reasons.join(", ")}`);

      console.log("🧠 AI 보완 진행 중...");
      const enhanced = await this.enhanceWithAI(prompt, ruleBasedPlan);

      console.log(`\n✨ AI 보완 완료:`);
      console.log(`   개선된 카테고리: ${enhanced.majorCategory}`);
      console.log(`   개선된 키워드: [${(enhanced.keywords || []).join(", ")}]`);
      console.log(
          `   키워드 수 변화: ${(ruleBasedPlan.keywords || []).length} → ${(enhanced.keywords || []).length}`
      );

      console.log("=".repeat(60));
      return enhanced;
    }

    console.log("⚡ 규칙 기반 처리로 충분함");
    console.log("=".repeat(60));
    return ruleBasedPlan;
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
    const allowedCategories = [
      "교통및물류",
      "공공질서및안전",
      "일반공공행정",
      "사회복지",
      "문화체육관광",
      "교육",
      "환경",
      "산업·통상·중소기업",
      "보건",
      "농림",
      "지역개발",
      "재정·세제·금융",
      "과학기술",
      "통신",
    ];

    return `
당신은 쿼리 플래너 보조자입니다. 아래의 "규칙 기반 쿼리 계획"을 참고하여 더 나은 계획을 제시하세요.
반드시 아래 JSON 스키마만 반환하고, 마크다운/설명은 포함하지 마세요.

원본 사용자 프롬프트: ${JSON.stringify(prompt)}
규칙 기반 쿼리 계획: ${JSON.stringify(ruleBasedPlan)}

다음 요구사항을 만족하세요:
1) 키워드 확장/보완: 누락된 핵심 키워드 추가, 동의어/유의어 보강, 불필요 단어 제거
2) 카테고리 정밀화: 의도에 맞는 대분류 선택(아래 목록 중 택1)
   - ${allowedCategories.join(", ")}
3) 검색 전략: limit, hasDateFilter, searchYear, providerAgency를 상황에 맞게 조정

응답은 반드시 아래 JSON 객체 포맷으로만 반환:
{
  "majorCategory": "위 목록 중 하나",
  "keywords": ["핵심 키워드", "..."],
  "searchYear": 2024 | null,
  "providerAgency": "기관명 또는 '기타기관'",
  "hasDateFilter": true/false,
  "limit": 10
}
    `.trim();
  }

  /**
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
      const response = await fetch("http://localhost:8080/api/query-plan", {
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