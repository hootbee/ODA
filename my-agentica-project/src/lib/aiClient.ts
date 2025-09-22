// src/lib/aiClient.ts
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required");

// ✅ 공식 Gemini SDK 클라이언트
export const geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);

// 기본 모델(필요시 바꿔도 여기만 수정)
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";