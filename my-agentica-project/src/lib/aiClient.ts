// src/lib/aiClient.ts
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { safeParseJson } from "./jsonUtils";
import {
  bucketsSchema,
  simpleIdeaSchema,
} from "../services/dataUtilization.schema";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required");

// ✅ 공식 Gemini SDK 클라이언트
export const geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);

// 기본 모델(필요시 바꿔도 여기만 수정)
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

/** 단일: JSON "배열" [{title, content}] 강제 */
export async function chatJsonArrayTC(prompt: string): Promise<any> {
  console.log("[DEBUG: aiClient.ts] chatJsonArrayTC 진입");
  const model = geminiClient.getGenerativeModel({
    model: DEFAULT_GEMINI_MODEL,
    systemInstruction: `
You are a helpful assistant.
- Output MUST be a JSON array (no markdown, no extra text).
- Each item MUST be: { "title": string, "content": string }.
- Language: Korean.
      `,
  });

  try {
    console.log("[DEBUG: aiClient.ts] model.generateContent 호출 시작");
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 2000,
        responseMimeType: "application/json",
      },
    });
    console.log("[DEBUG: aiClient.ts] model.generateContent 호출 성공");

    const text = result.response.text() ?? "";
    console.log("[DEBUG: aiClient.ts] LLM으로부터 받은 원본 텍스트:", text);
    const parsed = safeParseJson(text);
    console.log("[DEBUG: aiClient.ts] 파싱 후 결과:", parsed);
    return parsed ?? [];
  } catch (e) {
    console.error("[DEBUG: aiClient.ts] chatJsonArrayTC에서 예외 발생:", e);
    return { error: true, message: e instanceof Error ? e.message : String(e) };
  }
}

/** 심플: JSON "객체" {title, content} 강제 */
export async function chatJsonObjectTC(userPrompt: string): Promise<any> {
  const model = geminiClient.getGenerativeModel({
    model: DEFAULT_GEMINI_MODEL,
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
      responseSchema: simpleIdeaSchema as any,
    },
  });

  const text = result.response.text() ?? "";
  return safeParseJson(text) ?? null;
}

/** 전체: 4버킷 오브젝트 강제 */
export async function chatJsonBuckets(prompt: string): Promise<any> {
  const model = geminiClient.getGenerativeModel({
    model: DEFAULT_GEMINI_MODEL,
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
  console.log("[DEBUG: aiClient.ts] LLM(buckets):", text);
  return safeParseJson(text) ?? null;
}