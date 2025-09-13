// services/DataUtilizationService.ts
import type OpenAI from "openai";

interface UtilizationIdea {
  title: string;
  description: string;
  effect: string;
}

export class DataUtilizationService {
  constructor(
      private readonly llm: OpenAI,
      private readonly model: string
  ) {}

  // ===== 프롬프트 구성 =====
  private buildFullAnalysisPrompt(dataInfo: any): Record<string, string> {
    const base = `데이터 정보: ${JSON.stringify(dataInfo)}
각 분석 유형에서 데이터 활용 아이디어 2개씩 JSON 배열로 제시하세요.
반드시 아래 포맷을 따르세요:
[
  {"title":"아이디어 제목","description":"간략 설명","effect":"기대 효과"}
]`;
    return {
      business: `비즈니스 관점에서 ${base}`,
      research: `연구 관점에서 ${base}`,
      policy: `정책 관점에서 ${base}`,
      social_problem: `사회문제 해결 관점에서 ${base}`,
    };
  }

  private buildPredefinedSinglePrompt(dataInfo: any, analysisType: string): string {
    const typeMap = {
      business: "비즈니스",
      research: "연구",
      policy: "정책",
      social_problem: "사회문제 해결",
    } as const;
    const typeName = (typeMap as any)[analysisType] || analysisType;

    return `데이터 정보: ${JSON.stringify(dataInfo)}
${typeName} 관점에서 데이터 활용 아이디어 2개를 JSON 배열로 제시하세요.
반드시 아래 포맷을 따르세요:
[
  {"title":"아이디어 제목","description":"간략 설명","effect":"기대 효과"}
]`;
  }

  private buildCustomSinglePrompt(dataInfo: any, promptHint: string): string {
    return `데이터 정보: ${JSON.stringify(dataInfo)}
사용자 요청: ${promptHint}
요청에 맞는 데이터 활용 방안 1~2개를 아래 JSON 배열로 제시하세요:
[
  {"title":"아이디어 제목","content":"상세 설명"}
]
응답은 반드시 위 JSON 배열 형식으로 반환하세요.`;
  }

  // ===== LLM 호출 =====
  private async chatJSON(prompt: string): Promise<string> {
    const res = await this.llm.chat.completions.create({
      model: this.model,
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
              "You are a helpful assistant that ALWAYS returns pure JSON with no markdown. No explanations.",
        },
        { role: "user", content: prompt },
      ],
      // 일부 엔드포인트는 json_object를 지원하지 않을 수 있어 안전하게 프롬프트 강제
      // response_format: { type: "json_object" },
    });
    return res.choices[0]?.message?.content ?? "[]";
  }

  // ===== JSON 정제/파싱 =====
  private cleanJsonResponse(response: string): string {
    let cleaned = response.replace(/```(?:json)?|```/g, "").trim();
    const s = cleaned.indexOf("[");
    const e = cleaned.lastIndexOf("]");
    if (s !== -1 && e !== -1 && e > s) cleaned = cleaned.substring(s, e + 1);
    return cleaned;
  }

  private parseIdeasDescEffect(response: string, type: string): UtilizationIdea[] {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) {
        return [{ title: "형식 오류", description: "응답이 배열이 아닙니다.", effect: "" }];
      }
      const out = parsed.filter(
          (x: any) => x && x.title && x.description && x.effect
      );
      return out.length
          ? out
          : [
            { title: `${this.getKo(type)} 1`, description: "생성된 추천 내용이 없습니다.", effect: "" },
            { title: `${this.getKo(type)} 2`, description: "생성된 추천 내용이 없습니다.", effect: "" },
          ];
    } catch (err: any) {
      return [
        { title: `${this.getKo(type)} 분석 중 오류`, description: String(err?.message || err), effect: "" },
      ];
    }
  }

  private parseCustom(response: string): Array<{ title: string; content: string }> {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) {
        return [{ title: "형식 오류", content: "응답이 배열이 아닙니다." }];
      }
      const out = parsed.filter((x: any) => x && x.title && x.content);
      return out.length ? out : [{ title: "결과 없음", content: "생성된 추천이 없습니다." }];
    } catch (err: any) {
      return [{ title: "추천 오류", content: String(err?.message || err) }];
    }
  }

  private getKo(type: string) {
    const m: any = {
      business: "비즈니스 활용방안",
      research: "연구 활용방안",
      policy: "정책 활용방안",
      social_problem: "사회문제 해결방안",
    };
    return m[type] || type;
  }

  private formatResults(results: any) {
    return {
      businessApplications: results.business || [],
      researchApplications: results.research || [],
      policyApplications: results.policy || [],
      socialProblemApplications: results.social_problem || [],
    };
  }

  private getDefaultRecommendations() {
    const def = { description: "기본 추천 내용입니다.", effect: "추천 생성 실패" };
    return {
      businessApplications: [
        { title: "데이터 기반 비즈니스 모델 개발", ...def },
        { title: "관련 분야 컨설팅 서비스 제공", ...def },
      ],
      researchApplications: [
        { title: "현황 분석 및 트렌드 연구", ...def },
        { title: "정책 효과성 분석 연구", ...def },
      ],
      policyApplications: [
        { title: "정책 수립 시 근거 자료로 활용", ...def },
        { title: "예산 배정 및 우선순위 결정", ...def },
      ],
      socialProblemApplications: [
        { title: "사회 안전망 강화", ...def },
        { title: "시민 편의 증진", ...def },
      ],
    };
  }

  // ===== 공개 메서드 =====
  public async generateRecommendations(dataInfo: {
    fileName: string;
    title: string;
    category: string;
    keywords: string;
    description: string;
    providerAgency: string;
  }) {
    try {
      const prompts = this.buildFullAnalysisPrompt(dataInfo);
      const results: any = {};
      for (const [type, prompt] of Object.entries(prompts)) {
        const resp = await this.chatJSON(prompt);
        results[type] = this.parseIdeasDescEffect(resp, type);
      }
      return this.formatResults(results);
    } catch (e) {
      console.error("전체 활용 분석 오류:", e);
      return this.getDefaultRecommendations();
    }
  }

  public async generateSingleRecommendation(dataInfo: any, analysisTypeOrPrompt: string) {
    const predefined = ["business", "research", "policy", "social_problem"];
    try {
      if (predefined.includes(analysisTypeOrPrompt)) {
        const prompt = this.buildPredefinedSinglePrompt(dataInfo, analysisTypeOrPrompt);
        const resp = await this.chatJSON(prompt);
        const recommendations = this.parseIdeasDescEffect(resp, analysisTypeOrPrompt);
        return { type: analysisTypeOrPrompt, recommendations };
      } else {
        const prompt = this.buildCustomSinglePrompt(dataInfo, analysisTypeOrPrompt);
        const resp = await this.chatJSON(prompt);
        const recommendations = this.parseCustom(resp);
        return { type: "simple_recommendation", recommendations };
      }
    } catch (e: any) {
      return { type: "error", recommendations: [{ title: "오류 발생", content: String(e?.message || e) }] };
    }
  }
}
