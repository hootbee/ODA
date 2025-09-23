// my-agentica-project/src/services/DataAnalysisService.ts
import type { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs/promises";

export type DataAnalysisDeps = {
  llm: GoogleGenerativeAI;
  model: string;
};

/**
 * 데이터 분석 및 보고서 생성 전문 서비스
 * CSV 파일을 분석하고, 대화 히스토리를 활용해 심층적인 인사이트를 제공합니다.
 */
export class DataAnalysisService {
  private readonly llm: GoogleGenerativeAI;
  private readonly model: string;

  constructor(deps: DataAnalysisDeps) {
    this.llm = deps.llm;
    this.model = deps.model;
  }

  /**
   * CSV 파일을 읽고 분석하여 보고서를 생성합니다.
   * @param filePath 분석할 CSV 파일의 경로
   * @param userPrompt 사용자의 구체적인 분석 요청 (예: "더 자세히 분석해줘")
   * @param previousResult 이전 분석 결과 (보고서 텍스트)
   */
  public async analyzeCsvFile(
    filePath: string,
    userPrompt: string = "파일의 내용을 분석하고, 핵심 인사이트를 담은 보고서를 작성해줘.",
    previousResult?: string,
  ): Promise<string> {
    const fileContent = await this.readFileContent(filePath);
    const prompt = this.buildAnalysisPrompt(fileContent, userPrompt, previousResult);
    return this.chatWithReportOutput(prompt);
  }

  private async readFileContent(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      // 파일이 너무 큰 경우 일부만 사용
      return content.length > 10000 ? content.substring(0, 10000) : content;
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      throw new Error(`Failed to read file for analysis.`);
    }
  }

  // my-agentica-project/src/services/DataAnalysisService.ts

  private buildAnalysisPrompt(
      fileContent: string,
      userPrompt: string,
      previousResult?: string,
  ): string {
    const context = previousResult
        ? `
# 이전 분석 내용 (참고)
직전에 다음과 같은 보고서를 생성했습니다. 이 내용을 바탕으로 사용자의 현재 요청에 맞춰 더 구체화하거나 확장된 보고서를 작성해주세요.
--- 이전 보고서 시작 ---
${previousResult}
--- 이전 보고서 끝 ---
`
        : "";

    return `
# 분석 대상 데이터 (CSV 일부)
[CSV 일부 시작]
${fileContent}
[CSV 일부 끝]

# 요청사항
위 데이터를 분석하여 다음 사용자 요청에 맞는 보고서를 작성하세요:
"${userPrompt}"

${context}
`.trim();
  }
  /**
   * LLM 호출 (한국어 보고서 출력 포맷 강제)
   */
  private async chatWithReportOutput(prompt: string): Promise<string> {
    const model = this.llm.getGenerativeModel({
      model: this.model,
      systemInstruction: `
You are a data analyst who specializes in writing insightful reports in Korean. Your response must be a well-structured report in Markdown format.

Follow this structure:
1.  **분석 개요 (Analysis Overview):** Briefly describe the purpose and scope of the analysis.
2.  **핵심 인사이트 (Key Insights):** Present the most important findings as bullet points.
3.  **상세 분석 (Detailed Analysis):** Provide a more in-depth explanation of the data and insights.
4.  **결론 및 제언 (Conclusion & Recommendations):** Conclude the report and suggest potential actions or further research.

- The entire report must be in Korean.
- Do not include any text other than the report itself.
      `,
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.6,
      },
    });

    return result.response.text();
  }
}
