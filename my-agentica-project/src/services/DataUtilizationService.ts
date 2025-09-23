import type { GoogleGenerativeAI } from "@google/generative-ai";

/** 프론트가 쓰는 공통 DTO */
export type UtilizationIdea = {
  title: string;
  description?: string;
  effect?: string;
  content?: string;
};

export type SingleRecommendationDTO = {
  type:
      | "business"
      | "policy"
      | "research"
      | "social_problem"
      | "simple_recommendation"
      | "error";
  recommendations: UtilizationIdea[];
};

export type AllRecommendationsDTO = {
  businessApplications: UtilizationIdea[];
  researchApplications: UtilizationIdea[];
  policyApplications: UtilizationIdea[];
  socialProblemApplications: UtilizationIdea[];
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
  // 1) 그냥 시도
  try {
    return JSON.parse(text);
  } catch {}

  // 2) 코드펜스/앞뒤 잡음 제거
  let cleaned = text.replace(/```(?:json)?|```/g, "").trim();

  // 3) 마지막 닫는 괄호까지 자르기
  const lastObj = cleaned.lastIndexOf("}");
  const lastArr = cleaned.lastIndexOf("]");
  const cut = Math.max(lastObj, lastArr);
  if (cut > 0) {
    try {
      return JSON.parse(cleaned.slice(0, cut + 1));
    } catch {}
  }

  // 4) 흔한 오류 정정: 끝에 붙은 trailing comma 제거
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 5) 더는 못살리면 null
  return null;
}

/* ------------------------ 공통 아이템 정규화 유틸 ------------------------ */
function normalizeIdeas(arr: any[] = []): UtilizationIdea[] {
  return arr.map((x) => ({
    title: x?.title ?? "제목 없음",
    description: x?.description ?? "",
    content: x?.content ?? x?.description ?? "",
    effect: x?.effect ?? "",
  }));
}

/* --------------------------- 스키마 정의 --------------------------- */
// 단일/여러 아이템 공통
const ideaSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    content: { type: "string" },
    effect: { type: "string" },
  },
  required: ["title"],
};

// 단일 활용: "반드시 배열"로 강제 (프론트는 recommendations: [] 사용)
const arrayOfIdeasSchema = {
  type: "array",
  items: ideaSchema,
};

// 전체 활용: 4버킷 오브젝트
const bucketsSchema = {
  type: "object",
  properties: {
    businessApplications: { type: "array", items: ideaSchema },
    researchApplications: { type: "array", items: ideaSchema },
    policyApplications: { type: "array", items: ideaSchema },
    socialProblemApplications: { type: "array", items: ideaSchema },
  },
  required: [
    "businessApplications",
    "researchApplications",
    "policyApplications",
    "socialProblemApplications",
  ],
};

/* --------------------------- 서비스 본체 --------------------------- */
export class DataUtilizationService {
  constructor(
      private readonly llm: GoogleGenerativeAI,
      private readonly model: string
  ) {}

  /* ========== 공개 메서드 ========== */

  /** 전체 활용방안 (4버킷) */
  public async generateAllRecommendations(
      dataInfo: DataInfo,
      previousResult?: any
  ): Promise<AllRecommendationsDTO> {
    const prompt = this.buildAllRecommendationsPrompt(dataInfo, previousResult);
    trace(`[all] prompt length: ${prompt.length.toLocaleString()} chars`);

    // 1) 스키마 강제 JSON 호출
    const raw = await this.chatJsonBuckets(prompt);

    // 2) 조기 반환(정상)
    if (raw && typeof raw === "object") {
      return {
        businessApplications: normalizeIdeas(raw.businessApplications ?? []),
        researchApplications: normalizeIdeas(raw.researchApplications ?? []),
        policyApplications: normalizeIdeas(raw.policyApplications ?? []),
        socialProblemApplications: normalizeIdeas(
            raw.socialProblemApplications ?? []
        ),
      };
    }

    // 3) 보수 파서 시도 (모델이 가끔 틀릴 때)
    const repaired = safeParseJson(String(raw ?? ""));
    if (repaired && typeof repaired === "object") {
      return {
        businessApplications: normalizeIdeas(repaired.businessApplications ?? []),
        researchApplications: normalizeIdeas(repaired.researchApplications ?? []),
        policyApplications: normalizeIdeas(repaired.policyApplications ?? []),
        socialProblemApplications: normalizeIdeas(
            repaired.socialProblemApplications ?? []
        ),
      };
    }

    // 4) 완전 실패 시 빈 버킷
    return {
      businessApplications: [],
      researchApplications: [],
      policyApplications: [],
      socialProblemApplications: [],
    };
  }

  /** 단일 활용방안 (비즈니스/정책/연구/사회문제, 또는 자유 프롬프트) */
  public async generateSingleRecommendation(
      dataInfo: DataInfo,
      analysisType: string,
      previousResult?: any
  ): Promise<SingleRecommendationDTO> {
    const prompt = this.buildSingleRecommendationPrompt(
        dataInfo,
        analysisType,
        previousResult
    );
    trace(`[single] prompt length: ${prompt.length.toLocaleString()} chars`);

    // 1) 스키마 강제: "반드시 배열"
    let arr = await this.chatJsonArray(prompt);

    // 2) 보수 파서
    if (!Array.isArray(arr)) {
      const repaired = safeParseJson(String(arr ?? ""));
      arr = Array.isArray(repaired) ? repaired : [repaired].filter(Boolean);
    }

    const recommendations = normalizeIdeas(arr ?? []);

    // 타입 추정 (없으면 simple_recommendation)
    const map: Record<string, SingleRecommendationDTO["type"]> = {
      비즈니스: "business",
      사업: "business",
      정책: "policy",
      연구: "research",
      사회문제: "social_problem",
    };
    const type =
        map[analysisType.trim()] ?? ("simple_recommendation" as const);

    return { type, recommendations };
  }

  /* ========== 프롬프트 빌더 ========== */

  private buildSingleRecommendationPrompt(
      dataInfo: DataInfo,
      analysisType: string,
      previousResult?: any
  ): string {
    const prev = previousResult ? JSON.stringify(previousResult, null, 2) : "";
    const safePrev =
        prev.length > 4000 ? prev.slice(0, 4000) + " …(truncated)" : prev;

    const context = previousResult
        ? `
# 이전 제안 내용 (참고)
직전에 다음과 같은 아이디어를 제안했습니다. 이 내용을 바탕으로 사용자의 현재 요청에 맞춰 더 구체화하거나 확장해주세요.

[이전 제안 JSON]
${safePrev}
`
        : "";

    return `
# 데이터 정보
- 제목: ${dataInfo.title}
- 설명: ${dataInfo.description}
- 키워드: ${dataInfo.keywords}
- 카테고리: ${dataInfo.category}

# 요청사항
위 데이터를 활용하여 다음 요청에 대한 아이디어를 1개 제안하세요:
"${analysisType}"
${context}
`.trim();
  }

  private buildAllRecommendationsPrompt(
      dataInfo: DataInfo,
      previousResult?: any
  ): string {
    const prev = previousResult ? JSON.stringify(previousResult, null, 2) : "";
    const safePrev =
        prev.length > 4000 ? prev.slice(0, 4000) + " …(truncated)" : prev;

    const context = previousResult
        ? `
# 이전 제안 내용 (참고)
직전에 다음과 같은 아이디어를 제안했습니다. 이 내용을 바탕으로 사용자의 현재 요청에 맞춰 더 구체화하거나 확장해주세요.

[이전 제안 JSON]
${safePrev}
`
        : "";

    return `
# 데이터 정보
- 제목: ${dataInfo.title}
- 설명: ${dataInfo.description}
- 키워드: ${dataInfo.keywords}
- 카테고리: ${dataInfo.category}

# 요청사항
위 데이터를 활용할 수 있는 방안 4가지를 다음 카테고리별로 제안하세요:
1. 비즈니스 모델
2. 사회문제 해결
3. 연구/인사이트
4. 정책 제언
${context}
`.trim();
  }

  /* ========== LLM 호출 (스키마 강제) ========== */

  /** 배열(JSON array) 강제 */
  private async chatJsonArray(prompt: string): Promise<any> {
    const model = this.llm.getGenerativeModel({
      model: this.model,
      systemInstruction: `
You are a data utilization plan expert.
- Output MUST be a JSON array (no markdown, no extra text).
- Each item: { "title": string, "content": string, "effect": string, "description": string }
- Language: Korean.
      `,
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 2000,
        responseMimeType: "application/json",
        // ✅ 스키마 강제: 반드시 배열
        responseSchema: arrayOfIdeasSchema as any,
      },
    });

    const text = result.response.text() ?? "";
    console.log("[DEBUG] [DataUtilizationService] LLM 응답(JSON array):", text);
    return safeParseJson(text) ?? [];
  }

  /** 버킷 오브젝트(JSON object) 강제 */
  private async chatJsonBuckets(prompt: string): Promise<any> {
    const model = this.llm.getGenerativeModel({
      model: this.model,
      systemInstruction: `
You are a data utilization plan expert.
- Output MUST be a JSON object (no markdown, no extra text).
- Object keys: businessApplications, researchApplications, policyApplications, socialProblemApplications
- Each value is a JSON array of items: { "title": string, "content": string, "effect": string, "description": string }
- Language: Korean.
      `,
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 2000,
        responseMimeType: "application/json",
        // ✅ 스키마 강제: 반드시 4버킷 오브젝트
        responseSchema: bucketsSchema as any,
      },
    });

    const text = result.response.text() ?? "";
    console.log("[DEBUG] [DataUtilizationService] LLM 응답(buckets):", text);
    return safeParseJson(text) ?? null;
  }
}