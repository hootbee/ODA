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

      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
      });

      const prompt = `
        You are a world-class data analysis AI. The following is the content of a CSV file.
        Your task is to first understand the structure and content of this data, and then provide a clear and concise analysis.

        Please perform the following steps:
        1.  **Summarize the data:** Briefly describe what the data in the file represents based on its headers and content.
        2.  **Identify Key Insights:** Extract the most important trends, patterns, or significant outliers from the data.
        3.  **Suggest Potential Uses:** Briefly suggest how this data could be used or what further analysis might be interesting.

        --- CSV DATA START ---
        ${decodedCsvData}
        --- CSV DATA END ---

        Please provide the entire analysis in Korean.
      `;

      console.log("Sending data to Gemini for analysis...");
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log("Successfully received analysis from Gemini.");
      return text;
    } catch (error) {
      console.error("Error during data analysis:", error);
      throw new Error("Failed to analyze CSV data with Gemini API.");
    }
  }
}
