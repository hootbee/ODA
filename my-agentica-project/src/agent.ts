import {
  Agentica,
  IAgenticaController,
  IAgenticaProps,
  IAgenticaVendor,
} from "@agentica/core";
import typia from "typia";
import { PublicDataService } from "./services/PublicDataService";
import { geminiClient, DEFAULT_GEMINI_MODEL } from "./lib/aiClient";

// ✨ 핵심: vendor를 unknown→IAgenticaVendor 로 캐스팅
const vendorAsOpenAI = {
  model: DEFAULT_GEMINI_MODEL,
  api: geminiClient,
} as unknown as IAgenticaVendor;

export const agent: Agentica<"gemini"> = new Agentica({
  model: "gemini",
  vendor: vendorAsOpenAI,  // <-- 캐스팅 적용
  controllers: [
    {
      protocol: "class",
      name: "publicData",
      application: typia.llm.application<PublicDataService, "gemini">(),
      execute: new PublicDataService({
        llm: geminiClient,
        model: DEFAULT_GEMINI_MODEL,
      }),
    } satisfies IAgenticaController<"gemini">,
  ],
} satisfies IAgenticaProps<"gemini">);