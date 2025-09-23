
import type { GoogleGenerativeAI } from "@google/generative-ai";

// [수정] DTO와 스키마를 모드에 따라 명확히 분리

/** 단일/심플 모드용 아이디어 DTO */
export type SimpleUtilizationIdea = {
  title: string;
  content: string;
};

/** 전체 활용 모드용 아이디어 DTO */
export type RichUtilizationIdea = {
  title: string;
  content: string;
  description: string;
  effect: string;
};

export type SingleLikeDTO = {
  type: "simple_recommendation" | "error";
  recommendations: SimpleUtilizationIdea[]; // SimpleUtilizationIdea 사용
  meta?: { mode: "single" | "simple" };
};

export type AllRecommendationsDTO = {
  businessApplications: RichUtilizationIdea[]; // RichUtilizationIdea 사용
  researchApplications: RichUtilizationIdea[];
  policyApplications: RichUtilizationIdea[];
  socialProblemApplications: RichUtilizationIdea[];
};

export type DataInfo = {
  title: string;
  description: string;
  keywords: string;
  category: string;
};

const TRACE = true;
const trace = (...args: any[]) => TRACE && console.log("[LLM_TRACE]", ...args);

/* --------------------------- JSON 보수 파서 --------------------------- */
function safeParseJson(text: string): any {
  try { return JSON.parse(text); } catch {}
  let cleaned = text.replace(/```(?:json)?|```/g, "").trim();
  const lastObj = cleaned.lastIndexOf("}");
  const lastArr = cleaned.lastIndexOf("]");
  const cut = Math.max(lastObj, lastArr);
  if (cut > 0) {
    try { return JSON.parse(cleaned.slice(0, cut + 1)); } catch {}
  }
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");
  try { return JSON.parse(cleaned); } catch {}
  console.error("[DEBUG: DataUtilizationService] safeParseJson 완전 실패:", text);
  return null;
}

/* --------------------------- 스키마 분리 --------------------------- */

/** Simple 모드용 스키마: { title, content } */
const simpleIdeaSchema = {
  type: "object",
  properties: { title: { type: "string" }, content: { type: "string" } },
  required: ["title", "content"],
};
const arrayOfSimpleIdeaSchema = { type: "array", items: simpleIdeaSchema };

/** Rich 모드(전체 활용)용 스키마: { title, content, description, effect } */
const richIdeaSchema = {
  type: "object",
  properties: { 
    title: { type: "string" }, 
    content: { type: "string" },
    description: { type: "string" },
    effect: { type: "string" },
  },
  required: ["title", "content", "description", "effect"],
};

const bucketsSchema = {
  type: "object",
  properties: {
    businessApplications: { type: "array", items: richIdeaSchema }, // Rich 스키마 사용
    researchApplications: { type: "array", items: richIdeaSchema },
    policyApplications: { type: "array", items: richIdeaSchema },
    socialProblemApplications: { type: "array", items: richIdeaSchema },
  },
  required: [
    "businessApplications",
    "researchApplications",
    "policyApplications",
    "socialProblemApplications",
  ],
};

export class DataUtilizationService {
  constructor(
      private readonly llm: GoogleGenerativeAI,
      private readonly model: string
  ) {}

  /* ========== 공개 메서드 ========== */

  /** 전체 활용(4버킷) - Rich DTO 반환 */
  public async generateAllRecommendations(
      dataInfo: DataInfo,
      previousResult?: any
  ): Promise<AllRecommendationsDTO> {
    const prompt = this.buildAllRecommendationsPrompt(dataInfo, previousResult);
    trace(`[all] prompt length: ${prompt.length.toLocaleString()} chars`);
    const raw = await this.chatJsonBuckets(prompt);

    const obj = raw && typeof raw === "object" ? raw : safeParseJson(String(raw ?? ""));
    return {
      businessApplications: (obj?.businessApplications ?? []) as RichUtilizationIdea[],
      researchApplications: (obj?.researchApplications ?? []) as RichUtilizationIdea[],
      policyApplications: (obj?.policyApplications ?? []) as RichUtilizationIdea[],
      socialProblemApplications: (obj?.socialProblemApplications ?? []) as RichUtilizationIdea[],
    };
  }

  /** 단일(!활용) — Simple DTO 반환 */
  public async generateSingleByPrompt(
      dataInfo: DataInfo,
      userPrompt: string,
      previousResult?: any
  ): Promise<SingleLikeDTO> {
    console.log("\n[DEBUG: DataUtilizationService.ts] generateSingleByPrompt 진입");
    const prompt = this.buildSinglePrompt(dataInfo, userPrompt, previousResult);
    
    console.log("[DEBUG: DataUtilizationService.ts] chatJsonArrayTC 호출 예정");
    let arr = await this.chatJsonArrayTC(prompt);
    console.log("[DEBUG: DataUtilizationService.ts] chatJsonArrayTC로부터 받은 원본 응답 (arr):", arr);

    if (!Array.isArray(arr)) {
      console.log("[DEBUG: DataUtilizationService.ts] 응답이 배열이 아니므로, 복구 로직 시도");
      const repaired = safeParseJson(String(arr ?? ""));
      console.log("[DEBUG: DataUtilizationService.ts] 복구 시도 후 (repaired):", repaired);
      arr = Array.isArray(repaired) ? repaired : [repaired].filter(Boolean);
    }

    const first = arr?.[0];
    console.log("[DEBUG: DataUtilizationService.ts] 최종 배열의 첫 번째 항목 (first):", first);

    if (!first?.title || !first?.content) {
      console.error("[DEBUG: DataUtilizationService.ts] 최종 항목에 title 또는 content가 없어 에러 DTO 반환");
      return {
        type: "error",
        recommendations: [{ title: "생성 실패", content: "AI가 요청에 맞는 유효한 형식의 결과를 만들지 못했습니다." }],
        meta: { mode: "single" },
      };
    }

    console.log("[DEBUG: DataUtilizationService.ts] 성공 DTO 반환");
    return {
      type: "simple_recommendation",
      recommendations: [{ title: first.title, content: first.content }],
      meta: { mode: "single" },
    };
  }

  /** 심플 모드(자유 프롬프트) - Simple DTO 반환 */
  public async generateSimplePassThrough(
      userPrompt: string,
      previousResult?: any 
  ): Promise<SingleLikeDTO> {
    console.log("\n[DEBUG: DataUtilizationService.ts] generateSimplePassThrough 진입");
    const prompt = this.buildSimplePrompt(userPrompt, previousResult);
    const obj = await this.chatJsonObjectTC(prompt);
    const o = obj && obj.title && obj.content ? obj : { title: "결과", content: "생성 실패" };
    return {
      type: "simple_recommendation",
      recommendations: [o],
      meta: { mode: "simple" },
    };
  }

  /* ========== 프롬프트 빌더 ========== */

  private buildSimplePrompt(userPrompt: string, previousResult?: any): string {
    const prev = previousResult ? JSON.stringify(previousResult, null, 2) : "";
    const safePrev = prev.length > 4000 ? prev.slice(0, 4000) + " …(truncated)" : prev;
    const context = previousResult
        ? `
# 이전 대화 내용 (참고)
아래 내용을 참고하여 사용자의 현재 요청에 답변하세요.
[이전 대화 내용 JSON]
${safePrev}
`
        : "";

    const prompt = `
# 요청사항
아래 사용자의 요구에 맞춘 답변을 생성하세요.
- 응답은 반드시 { "title": "...", "content": "..." } 형식의 JSON 객체여야 합니다.
- 마크다운, 주석, 기타 텍스트 없이 순수한 JSON 객체만 반환해야 합니다.
${context}
[사용자 요청]
${userPrompt}
`.trim();
    console.log(`[DEBUG: DataUtilizationService.ts] buildSimplePrompt 생성 완료:
--- PROMPT START ---
${prompt}
--- PROMPT END ---`);
    return prompt;
  }

  private buildSinglePrompt(
      dataInfo: DataInfo,
      userPrompt: string,
      previousResult?: any
  ): string {
    const prev = previousResult ? JSON.stringify(previousResult, null, 2) : "";
    const safePrev = prev.length > 4000 ? prev.slice(0, 4000) + " …(truncated)" : prev;
    const context = previousResult
        ? `
# 이전 제안 내용 (참고)
아래 내용을 바탕으로 사용자의 요청을 더 구체적/연결감 있게 확장하세요.
[이전 제안 JSON]
${safePrev}
`
        : "";

    const prompt = `
# 데이터 정보
- 제목: ${dataInfo.title}
- 설명: ${dataInfo.description}

# 요청사항
아래 사용자의 요구에 맞춘 활용방안 아이디어를 1개 제안하고, 반드시 지정된 JSON 형식으로만 응답하세요.

## 출력 형식 (반드시 준수)
- 전체 응답은 순수 JSON 배열(길이 1)이어야 합니다: 
- 규칙 1: 마크다운, 주석, 기타 텍스트 없이 JSON만 반환하세요.
- 규칙 2: 
  - 
  
[사용자 요청]
${userPrompt}
${context}
`.trim();
    console.log(`[DEBUG: DataUtilizationService.ts] buildSinglePrompt 생성 완료:
--- PROMPT START ---
${prompt}
--- PROMPT END ---`);
    return prompt;
  }

  private buildAllRecommendationsPrompt(
      dataInfo: DataInfo,
      previousResult?: any
  ): string {
    const prev = previousResult ? JSON.stringify(previousResult, null, 2) : "";
    const safePrev = prev.length > 4000 ? prev.slice(0, 4000) + " …(truncated)" : prev;
    const context = previousResult
        ? `
# 이전 제안 내용 (참고)
[이전 제안 JSON]
${safePrev}
`
        : "";

    return `
# 데이터 정보
- 제목: ${dataInfo.title}
- 설명: ${dataInfo.description}

# 요청사항
아래 4개 버킷으로 활용방안을 제안하세요. 각 아이템은 반드시 title, description, content, effect 4개 필드를 모두 포함해야 합니다.
1) businessApplications
2) researchApplications
3) policyApplications
4) socialProblemApplications

- 반드시 단일 JSON "객체"로만 출력합니다(코드펜스/텍스트 금지).
${context}
`.trim();
  }

  /* ========== LLM 호출 ========== */

  /** 단일: JSON "배열" [{title, content}] 강제 */
  private async chatJsonArrayTC(prompt: string): Promise<any> {
    console.log("[DEBUG: DataUtilizationService.ts] chatJsonArrayTC 진입");
    const model = this.llm.getGenerativeModel({
      model: this.model,
      systemInstruction: `
You are a helpful assistant.
- Output MUST be a JSON array (no markdown, no extra text).
- Each item MUST be: { "title": string, "content": string }.
- Language: Korean.
      `,
    });

    try {
      console.log("[DEBUG: DataUtilizationService.ts] model.generateContent 호출 시작");
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 2000,
          responseMimeType: "application/json",
        },
      });
      console.log("[DEBUG: DataUtilizationService.ts] model.generateContent 호출 성공");

      const text = result.response.text() ?? "";
      console.log("[DEBUG: DataUtilizationService.ts] LLM으로부터 받은 원본 텍스트:", text);
      const parsed = safeParseJson(text);
      console.log("[DEBUG: DataUtilizationService.ts] 파싱 후 결과:", parsed);
      return parsed ?? [];
    } catch (e) {
      console.error("[DEBUG: DataUtilizationService.ts] chatJsonArrayTC에서 예외 발생:", e);
      return { error: true, message: e instanceof Error ? e.message : String(e) };
    }
  }

  /** 심플: JSON "객체" {title, content} 강제 */
  private async chatJsonObjectTC(userPrompt: string): Promise<any> {
    const model = this.llm.getGenerativeModel({
      model: this.model,
      systemInstruction: `
You are a helpful assistant. 
- Output MUST be a single JSON object { "title": string, "content": string }.
- No markdown, no extra text. 
- Language: Korean.
      `,
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 2000,
        responseMimeType: "application/json",
        responseSchema: simpleIdeaSchema as any, // [수정] simpleIdeaSchema 사용
      },
    });

    const text = result.response.text() ?? "";
    return safeParseJson(text) ?? null;
  }

  /** 전체: 4버킷 오브젝트 강제 */
  private async chatJsonBuckets(prompt: string): Promise<any> {
    const model = this.llm.getGenerativeModel({
      model: this.model,
      systemInstruction: `
You are a data utilization expert.
- Output MUST be a JSON object.
- Keys: businessApplications, researchApplications, policyApplications, socialProblemApplications.
- Each value: JSON array of { "title": string, "description": string, "content": string, "effect": string }.
- Language: Korean.
      `,
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 4000, 
        responseMimeType: "application/json",
        responseSchema: bucketsSchema as any,
      },
    });

    const text = result.response.text() ?? "";
    console.log("[DEBUG: DataUtilizationService] LLM(buckets):", text);
    return safeParseJson(text) ?? null;
  }
}
