import {
  AllRecommendationsDTO,
  DataInfo,
  RichUtilizationIdea,
  SingleLikeDTO,
} from "./dataUtilization.schema";
import { safeParseJson } from "../lib/jsonUtils";
import {
  buildAllRecommendationsPrompt,
  buildSimplePrompt,
  buildSinglePrompt,
} from "./dataUtilization.prompts";
import {
  chatJsonArrayTC,
  chatJsonBuckets,
  chatJsonObjectTC,
} from "../lib/aiClient";

const TRACE = true;
const trace = (...args: any[]) => TRACE && console.log("[LLM_TRACE]", ...args);

export class DataUtilizationService {
  constructor() {}

  /* ========== 공개 메서드 ========== */

  /** 전체 활용(4버킷) - Rich DTO 반환 */
  public async generateAllRecommendations(
    dataInfo: DataInfo,
    previousResult?: any
  ): Promise<AllRecommendationsDTO> {
    const prompt = buildAllRecommendationsPrompt(dataInfo, previousResult);
    trace(`[all] prompt length: ${prompt.length.toLocaleString()} chars`);
    const raw = await chatJsonBuckets(prompt);

    const obj =
      raw && typeof raw === "object" ? raw : safeParseJson(String(raw ?? ""));
    return {
      businessApplications:
        (obj?.businessApplications ?? []) as RichUtilizationIdea[],
      researchApplications:
        (obj?.researchApplications ?? []) as RichUtilizationIdea[],
      policyApplications: (obj?.policyApplications ?? []) as RichUtilizationIdea[],
      socialProblemApplications:
        (obj?.socialProblemApplications ?? []) as RichUtilizationIdea[],
    };
  }

  /** 단일(/활용) — Simple DTO 반환 */
  public async generateSingleByPrompt(
    dataInfo: DataInfo,
    userPrompt: string,
    previousResult?: any
  ): Promise<SingleLikeDTO> {
    console.log(
      "\n[DEBUG: DataUtilizationService.ts] generateSingleByPrompt 진입"
    );
    const prompt = buildSinglePrompt(dataInfo, userPrompt, previousResult);

    console.log("[DEBUG: DataUtilizationService.ts] chatJsonArrayTC 호출 예정");
    let arr = await chatJsonArrayTC(prompt);
    console.log(
      "[DEBUG: DataUtilizationService.ts] chatJsonArrayTC로부터 받은 원본 응답 (arr):",
      arr
    );

    if (!Array.isArray(arr)) {
      console.log(
        "[DEBUG: DataUtilizationService.ts] 응답이 배열이 아니므로, 복구 로직 시도"
      );
      const repaired = safeParseJson(String(arr ?? ""));
      console.log(
        "[DEBUG: DataUtilizationService.ts] 복구 시도 후 (repaired):",
        repaired
      );
      arr = Array.isArray(repaired) ? repaired : [repaired].filter(Boolean);
    }

    const first = arr?.[0];
    console.log(
      "[DEBUG: DataUtilizationService.ts] 최종 배열의 첫 번째 항목 (first):",
      first
    );

    if (!first?.title || !first?.content) {
      console.error(
        "[DEBUG: DataUtilizationService.ts] 최종 항목에 title 또는 content가 없어 에러 DTO 반환"
      );
      return {
        type: "error",
        recommendations: [
          {
            title: "생성 실패",
            content: "AI가 요청에 맞는 유효한 형식의 결과를 만들지 못했습니다.",
          },
        ],
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
    console.log(
      "\n[DEBUG: DataUtilizationService.ts] generateSimplePassThrough 진입"
    );
    const prompt = buildSimplePrompt(userPrompt, previousResult);
    const obj = await chatJsonObjectTC(prompt);
    const o =
      obj && obj.title && obj.content
        ? obj
        : { title: "결과", content: "생성 실패" };
    return {
      type: "simple_recommendation",
      recommendations: [o],
      meta: { mode: "simple" },
    };
  }
}
