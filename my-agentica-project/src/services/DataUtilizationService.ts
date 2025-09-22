// services/DataUtilizationService.ts
import type { GoogleGenerativeAI } from "@google/generative-ai";
import { performance as perf } from "node:perf_hooks"; // ✅ Node 전용 정적 임포트 (CJS/ESM 모두 OK)

const TRACE = true; // ✅ 항상 로그 출력
 const trace = (...args: any[]) => { if (TRACE) console.log("[LLM_TRACE]", ...args); };

interface UtilizationIdea {
  title: string;
  description?: string;
  effect?: string;
  content?: string;
}

export class DataUtilizationService {
  constructor(
      private readonly llm: GoogleGenerativeAI,
      private readonly model: string
  ) {}

  // ===== 프롬프트 구성 =====
  private buildFullAnalysisPrompt(dataInfo: any): Record<string, string> {
    const format = `출력은 반드시 JSON 배열:
[
  {"title":"제목","description":"짧은 설명","effect":"기대 효과"}
]`;

    return {
      business: `비즈니스 관점에서 데이터 활용 아이디어 2개. 데이터: ${JSON.stringify(dataInfo)}. ${format}`,
      research: `연구 관점에서 데이터 활용 아이디어 2개. 데이터: ${JSON.stringify(dataInfo)}. ${format}`,
      policy: `정책 관점에서 데이터 활용 아이디어 2개. 데이터: ${JSON.stringify(dataInfo)}. ${format}`,
      social_problem: `사회문제 해결 관점에서 데이터 활용 아이디어 2개. 데이터: ${JSON.stringify(dataInfo)}. ${format}`,
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
    return `데이터 정보:
\`\`\`json
${JSON.stringify(dataInfo, null, 2)}
\`\`\`

사용자 요청: "${promptHint}"

출력 지침:
- 반드시 JSON 배열 형식으로만 출력하세요.
- 각 아이디어는 {"title":"제목","content":"설명"} 형식입니다.
+ "content"는 반드시 하나의 서론 → 구체적 방안(리스트) → 결론(기대 효과)의 구조로 작성하세요.
+ 각 부분은 유기적으로 연결된 하나의 맥락 안에서 설명하세요.
+ 활용 방안 리스트는 반드시 기대 효과와 연결되도록 작성하세요.- 이모지(💡, 👉 등)는 자유롭게 사용할 수 있습니다.
- JSON 외의 다른 텍스트는 절대 포함하지 마세요.

출력 예시:
[
  {
    "title": "아이디어 제목",
    "content": "💡 핵심 설명 한두 문장.\\n\\n- 활용 방안 1: 구체적 설명\\n- 활용 방안 2: 단계적 설명\\n\\n👉 기대 효과: 한 문단으로 정리"
  }
]`;
  }

  // ===== Gemini 호출 (JSON 모드 + 타이밍 계측) =====
  private async chatJSON(prompt: string): Promise<string> {
    const t0 = perf.now();
    const promptLen = prompt.length;

    const model = this.llm.getGenerativeModel({
      model: this.model,
      systemInstruction:
          "You are a helpful assistant that ALWAYS returns pure JSON with no markdown. No explanations.",
    });
    const t1 = perf.now();
    trace(`model.getGenerativeModel: ${(t1 - t0).toFixed(1)} ms`);

    const tCallStart = perf.now();
    let respText = "[]";
    try {
      const resp = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }]}],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json", // ✅ JSON만
        },
      });
      const tCallEnd = perf.now();

      respText = resp.response.text() ?? "[]";
      const tParsed = perf.now();

      trace(`generateContent (network+inference): ${(tCallEnd - tCallStart).toFixed(1)} ms`);
      trace(`resp.response.text(): ${(tParsed - tCallEnd).toFixed(1)} ms`);
      trace(`sizes: prompt=${promptLen.toLocaleString()} chars, response=${respText.length.toLocaleString()} chars`);
      trace(`total chatJSON: ${(tParsed - t0).toFixed(1)} ms`);
    } catch (e: any) {
      const tErr = perf.now();
      trace(`generateContent ERROR after ${(tErr - tCallStart).toFixed(1)} ms:`, e?.message ?? e);
      throw e;
    }

    return respText;
  }

  // ===== JSON 정제/파싱 =====
  private cleanJsonResponse(response: string): string {
    const t0 = perf.now();
    let cleaned = response.replace(/```(?:json)?|```/g, "").trim();
    const s = cleaned.indexOf("[");
    const e = cleaned.lastIndexOf("]");
    if (s !== -1 && e !== -1 && e > s) cleaned = cleaned.substring(s, e + 1);
    const t1 = perf.now();
    trace(`cleanJsonResponse: ${(t1 - t0).toFixed(1)} ms`);
    return cleaned;
  }

  private parseIdeasDescEffect(response: string, type: string): UtilizationIdea[] {
    const t0 = perf.now();
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);
      const t1 = perf.now();
      trace(`JSON.parse (desc/effect): ${(t1 - t0).toFixed(1)} ms`);

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
    const t0 = perf.now();
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);
      const t1 = perf.now();
      trace(`JSON.parse (custom): ${(t1 - t0).toFixed(1)} ms`);

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
    const t0 = perf.now();
    try {
      const prompts = this.buildFullAnalysisPrompt(dataInfo);
      const results: any = {};

      for (const [type, prompt] of Object.entries(prompts)) {
        const tP0 = perf.now();
        trace(`[${type}] prompt length: ${prompt.length.toLocaleString()} chars`);
        const resp = await this.chatJSON(prompt);
        const tP1 = perf.now();
        results[type] = this.parseIdeasDescEffect(resp, type);
        const tP2 = perf.now();
        trace(`[${type}] chatJSON: ${(tP1 - tP0).toFixed(1)} ms, parse: ${(tP2 - tP1).toFixed(1)} ms, total: ${(tP2 - tP0).toFixed(1)} ms`);
      }

      const t1 = perf.now();
      trace(`generateRecommendations total: ${(t1 - t0).toFixed(1)} ms`);
      return this.formatResults(results);
    } catch (e) {
      console.error("전체 활용 분석 오류:", e);
      return this.getDefaultRecommendations();
    }
  }

  public async generateSingleRecommendation(dataInfo: any, analysisTypeOrPrompt: string) {
    const t0 = perf.now();
    const predefined = ["business", "research", "policy", "social_problem"];
    try {
      if (predefined.includes(analysisTypeOrPrompt)) {
        const prompt = this.buildPredefinedSinglePrompt(dataInfo, analysisTypeOrPrompt);
        trace(`[single:${analysisTypeOrPrompt}] prompt length: ${prompt.length.toLocaleString()} chars`);
        const resp = await this.chatJSON(prompt);
        const recommendations = this.parseIdeasDescEffect(resp, analysisTypeOrPrompt);
        trace(`[single:${analysisTypeOrPrompt}] total: ${(perf.now() - t0).toFixed(1)} ms`);
        return { type: analysisTypeOrPrompt, recommendations };
      } else {
        const prompt = this.buildCustomSinglePrompt(dataInfo, analysisTypeOrPrompt);
        trace(`[single:custom] prompt length: ${prompt.length.toLocaleString()} chars`);
        const resp = await this.chatJSON(prompt);
        const recommendations = this.parseCustom(resp);
        trace(`[single:custom] total: ${(perf.now() - t0).toFixed(1)} ms`);
        return { type: "simple_recommendation", recommendations };
      }
    } catch (e: any) {
      trace(`[single:${analysisTypeOrPrompt}] ERROR after ${(perf.now() - t0).toFixed(1)} ms`);
      return { type: "error", recommendations: [{ title: "오류 발생", content: String(e?.message || e) }] };
    }
  }
}