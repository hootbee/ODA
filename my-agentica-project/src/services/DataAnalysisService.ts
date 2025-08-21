// /Users/leejunhyeong/Desktop/oda/my-agentica-project/src/services/DataAnalysisService.ts
import * as fs from "fs/promises";
import * as path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as iconv from "iconv-lite";

export class DataAnalysisService {
  private readonly genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Gemini API key is required.");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Reads a CSV file with EUC-KR encoding, sends its content to the Gemini API for analysis,
   * and returns the summary.
   * @param filePath The absolute path to the CSV file.
   * @returns A promise that resolves to the analysis summary from Gemini.
   */
  public async analyzeCsvFile(filePath: string): Promise<string> {
    try {
      // Read file as a buffer
      const fileBuffer = await fs.readFile(filePath);

      // Decode from EUC-KR to UTF-8 string
      const decodedCsvData = iconv.decode(fileBuffer, "euc-kr");

      // Limit data to the first 100 lines for testing and efficiency
      const lines = decodedCsvData.split("\n");
      const partialData = lines.slice(0, 10).join("\n");

      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
      });

      const prompt = `
        당신은 CSV 데이터를 분석하여 보고서를 작성하는 최고의 데이터 분석 전문가입니다.
        주어진 CSV 데이터의 일부를 보고, 아래 지시사항에 따라 한국어로 상세한 분석 보고서를 작성해주세요.

        ### 분석할 CSV 데이터 (일부)
        \`\`\`csv
        ${partialData}
        \`\`\`

        ### 보고서에 반드시 포함할 4가지 항목:

        1.  **데이터 요약:**
            이 데이터가 무엇에 대한 내용인지 한두 문장으로 요약해주세요.

        2.  **핵심 인사이트:**
            데이터의 헤더와 내용을 바탕으로 발견할 수 있는 중요한 경향, 패턴, 또는 특이점을 2~3가지 찾아주세요.

        3.  **잠재적 활용 방안:**
            이 데이터를 활용하여 만들 수 있는 비즈니스 모델이나 공공 정책 아이디어를 구체적으로 제안해주세요.

        4.  **데이터 구조 예시 (JSON 형식):**
            데이터의 구조를 파악할 수 있도록, 헤더(첫 번째 줄)와 실제 데이터 3줄을 추출하여 아래 예시와 같은 JSON 형식으로 정리해주세요.
            (JSON 코드 블록 안에 넣어주세요)
            {
              "headers": ["헤더1", "헤더2", ...],
              "rows": [
                ["데이터1-1", "데이터1-2", ...],
                ["데이터2-1", "데이터2-2", ...],
                ["데이터3-1", "데이터3-2", ...]
              ]
            }
      `;

      console.log("Sending data to Gemini for analysis...");
      const result = await model.generateContent(prompt);
      const response = await result.response;

      if (response.usageMetadata) {
        const { promptTokenCount, candidatesTokenCount, totalTokenCount } =
          response.usageMetadata;
        console.log(
          `[Gemini 토큰 사용량] 데이터 분석 보고서 생성 | 입력: ${promptTokenCount} 토큰 | 출력: ${candidatesTokenCount} 토큰 | 총합: ${totalTokenCount} 토큰`
        );
      }

      const text = response.text();

      console.log("Successfully received analysis from Gemini.");
      return text;
    } catch (error) {
      console.error("Error during data analysis:", error);
      throw new Error("Failed to analyze CSV data with Gemini API.");
    }
  }
}
