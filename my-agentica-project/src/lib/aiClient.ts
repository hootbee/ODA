// src/lib/aiClient.ts
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required");

export const openaiClient = new OpenAI({
    apiKey: GEMINI_API_KEY,
    // Gemini OpenAI 호환 엔드포인트
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// 기본 모델(필요시 바꿔도 여기만 수정)
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
