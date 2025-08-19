// src/agent.ts
import {
  Agentica,
  IAgenticaController,
  IAgenticaProps,
  IAgenticaVendor,
} from "@agentica/core";
import OpenAI from "openai";
import typia from "typia";
import { PublicDataService } from "./services/PublicDataService";
import { SupabaseDbService } from "./services/SupabaseDbService";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set");
}

export const agent = new Agentica({
  model: "gemini",
  vendor: {
    api: new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    }),
  } satisfies IAgenticaVendor,
  controllers: [
    {
      protocol: "class",
      name: "publicData",
      application: typia.llm.application<PublicDataService, "gemini">(),
      execute: new PublicDataService(),
    } satisfies IAgenticaController<"gemini">,
    {
      protocol: "class",
      name: "supabaseDb",
      application: typia.llm.application<SupabaseDbService, "gemini">(),
      execute: new SupabaseDbService(),
    } satisfies IAgenticaController<"gemini">,
  ],
} satisfies IAgenticaProps<"gemini">);
