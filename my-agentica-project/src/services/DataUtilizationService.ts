// my-agentica-project/src/services/DataUtilizationService.ts
import type { GoogleGenerativeAI } from "@google/generative-ai";

// ===== 프론트와 연결되는 공통 DTO =====
export type UtilizationIdea = {
  title: string;
  description?: string;
  effect?: string;
  content?: string;
};

export type SingleRecommendationDTO = {
  type: "business" | "policy" | "research" | "social_problem" | "simple_recommendation" | "error";
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

// ===== 유틸: LLM 원본 JSON → DTO 변환 =====
function toSingleDTO(raw: any, typeGuess: SingleRecommendationDTO["type"]): SingleRecommendationDTO {
  if (Array.isArray(raw)) {
    const recs: UtilizationIdea[] = raw.map((x) => ({
      title: x?.title ?? "제목 없음",
      description: x?.description,
      effect: x?.effect,
      content: x?.content,
    }));
    return { type: typeGuess, recommendations: recs };
  }
  const one: UtilizationIdea = {
    title: raw?.title ?? "제목 없음",
    description: raw?.description,
    effect: raw?.effect,
    content: raw?.content,
  };
  return { type: typeGuess, recommendations: [one] };
}

function toAllDTO(raw: any): AllRecommendationsDTO {
  // 이미 올바른 형태면 그대로
  if (
      raw?.businessApplications ||
      raw?.researchApplications ||
      raw?.policyApplications ||
      raw?.socialProblemApplications
  ) {
    return raw as AllRecommendationsDTO;
  }

  // 배열이면 category로 버킷팅
  if (Array.isArray(raw)) {
    const buckets: AllRecommendationsDTO = {
      businessApplications: [],
      researchApplications: [],
      policyApplications: [],
      socialProblemApplications: [],
    };
    for (const x of raw) {
      const idea: UtilizationIdea = {
        title: x?.title ?? "제목 없음",
        description: x?.description,
        effect: x?.effect,
        content: x?.content,
      };
      const cat = String(x?.category ?? "").replace(/\s/g, "");
      if (/비즈니스/.test(cat)) buckets.businessApplications.push(idea);
      else if (/사회문제/.test(cat)) buckets.socialProblemApplications.push(idea);
      else if (/연구|인사이트/.test(cat)) buckets.researchApplications.push(idea);
      else if (/정책/.test(cat)) buckets.policyApplications.push(idea);
      else buckets.businessApplications.push(idea); // 기본 버킷
    }
    return buckets;
  }

  // 그 외 기본값
  return {
    businessApplications: [],
    researchApplications: [],
    policyApplications: [],
    socialProblemApplications: [],
  };
}

// ===== 서비스 구현 =====
const TRACE = true;
const trace = (...args: any[]) => { if (TRACE) console.log("[LLM_TRACE]", ...args); };

export class DataUtilizationService {
  constructor(
      private readonly llm: GoogleGenerativeAI,
      private readonly model: string,
  ) {}

  // ---------------------------
  // 공개 메서드
  // ---------------------------
  public async generateSingleRecommendation(
      dataInfo: DataInfo,
      analysisType: string,
      previousResult?: any,
  ): Promise<SingleRecommendationDTO> {
    const prompt = this.buildSingleRecommendationPrompt(dataInfo, analysisType, previousResult);
    trace(`[single] prompt length: ${prompt.length.toLocaleString()} chars`);
    const raw = await this.chatWithJsonOutput(prompt);

    const map: Record<string, SingleRecommendationDTO["type"]> = {
      "비즈니스": "business",
      "사업": "business",
      "정책": "policy",
      "연구": "research",
      "사회문제": "social_problem",
    };
    const guess = map[analysisType.trim()] ?? "simple_recommendation";
    return toSingleDTO(raw, guess);
  }

  public async generateAllRecommendations(
      dataInfo: DataInfo,
      previousResult?: any,
  ): Promise<AllRecommendationsDTO> {
    const prompt = this.buildAllRecommendationsPrompt(dataInfo, previousResult);
    trace(`[all] prompt length: ${prompt.length.toLocaleString()} chars`);
    const raw = await this.chatWithJsonOutput(prompt);
    return toAllDTO(raw);
  }

  // ---------------------------
  // 프롬프트 빌더
  // ---------------------------
  private buildSingleRecommendationPrompt(
      dataInfo: DataInfo,
      analysisType: string,
      previousResult?: any,
  ): string {
    const prev = previousResult ? JSON.stringify(previousResult, null, 2) : "";
    const safePrev = prev.length > 4000 ? prev.slice(0, 4000) + " …(truncated)" : prev;

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
      previousResult?: any,
  ): string {
    const prev = previousResult ? JSON.stringify(previousResult, null, 2) : "";
    const safePrev = prev.length > 4000 ? prev.slice(0, 4000) + " …(truncated)" : prev;

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

  // ---------------------------
  // LLM 호출 (JSON 강제)
  // ---------------------------
  private async chatWithJsonOutput(prompt: string): Promise<any> {
    console.log("[DEBUG] [DataUtilizationService] 프롬프트 시작 ===================");
    console.log(prompt);
    console.log("[DEBUG] [DataUtilizationService] 프롬프트 끝 =====================");

    const model = this.llm.getGenerativeModel({
      model: this.model,
      systemInstruction: `
You are a data utilization plan expert. Your response must be a single JSON object or a JSON array.
- For a single idea, return a JSON object: { "title": "...", "content": "...", "effect": "..." }
- For multiple ideas, return a JSON array of objects: [{ "title": "...", "category": "비즈니스 모델|사회문제 해결|연구/인사이트|정책 제언", "content": "...", "effect": "..." }, ...]
- Do not include markdown, comments, or any other text outside of the JSON.
- The content must be in Korean.
      `,
    });

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.6,
          maxOutputTokens: 384, // 속도/안정성 균형
        },
      });

      const text = result.response.text() ?? "";
      console.log("[DEBUG] [DataUtilizationService] LLM 원본 응답:", text);

      const parsed = JSON.parse(text);
      console.log("[DEBUG] [DataUtilizationService] JSON 파싱 성공 ✅");
      return parsed;

    } catch (e: any) {
      console.error("[ERROR] [DataUtilizationService] JSON 파싱 실패 ❌");
      console.error("에러 메시지:", e?.message || e);
      // 프론트가 깨지지 않도록 최소 DTO 형태 반환
      return {
        businessApplications: [],
        researchApplications: [],
        policyApplications: [],
        socialProblemApplications: [],
        error: true,
        message: "LLM 응답 파싱 실패",
        detail: e?.message || String(e),
      };
    }
  }
}