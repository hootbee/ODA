import {
  Agentica,
  IAgenticaController,
  IAgenticaProps,
  IAgenticaVendor,
} from "@agentica/core";
import typia from "typia";
import { PublicDataService } from "./services/PublicDataService";
import { geminiClient, DEFAULT_GEMINI_MODEL } from "./lib/aiClient";
import { DataDownloaderService } from "./services/DataDownloaderService";

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

export async function handleShowPublicDataChart(publicDataPk: string, fileDetailSn?: number) {
  const downloader = new DataDownloaderService();
  const payload = await downloader.getFileAsText(publicDataPk, { fileDetailSn, saveDir: "downloads" });

  return {
    type: "data_analysis_result",
    dataPayload: {
      format: payload.format, // "csv" | "json"
      text: payload.text,
      title: `공공데이터(${publicDataPk})`,
    },
    publicDataPk,
  };
}