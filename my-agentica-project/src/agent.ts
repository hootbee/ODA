import {
  Agentica,
  IAgenticaController,
  IAgenticaProps,
  IAgenticaVendor,
} from "@agentica/core";
import typia from "typia";
import { PublicDataService } from "./services/PublicDataService";
import { openaiClient, DEFAULT_GEMINI_MODEL } from "./lib/aiClient";

export const agent: Agentica<"gemini"> = new Agentica({
  model: "gemini",
  vendor: {
    model: DEFAULT_GEMINI_MODEL,
    api: openaiClient,
  } satisfies IAgenticaVendor,
  controllers: [
    {
      protocol: "class",
      name: "publicData",
      application: typia.llm.application<PublicDataService, "gemini">(),
      execute: new PublicDataService({
        llm: openaiClient,
        model: DEFAULT_GEMINI_MODEL,
      }),
    } satisfies IAgenticaController<"gemini">,
  ],
} satisfies IAgenticaProps<"gemini">);
