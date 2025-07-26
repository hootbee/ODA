import {
  Agentica,
  IAgenticaController,
  IAgenticaProps,
  IAgenticaVendor,
} from "@agentica/core";
import OpenAI from "openai";
import typia from "typia";
import { PublicDataService } from "./services/PublicDataService";
import dotenv from "dotenv";

// 환경변수 로드
dotenv.config();

// Gemini API 키 검증
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is required");
}

// OpenAI SDK를 통해 Gemini API 연결
export const agent: Agentica<"gemini"> = new Agentica({
  model: "gemini",
  vendor: {
    model: "gemini-1.5-flash",
    api: new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", // Gemini OpenAI 호환 엔드포인트
    }),
  } satisfies IAgenticaVendor,
  controllers: [
    {
      protocol: "class",
      name: "publicData",
      application: typia.llm.application<PublicDataService, "gemini">(),
      execute: new PublicDataService(),
    } satisfies IAgenticaController<"gemini">,
  ],
} satisfies IAgenticaProps<"gemini">);
