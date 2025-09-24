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
   * @param fileName 분석할 CSV 파일의 이름 (프롬프트에 포함하기 위함)
   * @param userPrompt 사용자의 구체적인 분석 요청 (예: "더 자세히 분석해줘")
   * @param previousResult 이전 분석 결과 (보고서 텍스트)
   */
  public async analyzeCsvFile(
    filePath: string,
    fileName: string, // [추가] 파일 이름을 받아 프롬프트에 활용
    userPrompt: string = "파일의 내용을 분석하고, 핵심 인사이트를 담은 보고서를 작성해줘.",
    previousResult?: string,
  ): Promise<string> {
    console.log("\n[DEBUG: DataAnalysisService.ts] --------------------------------------------------");
    console.log("[DEBUG: DataAnalysisService.ts] analyzeCsvFile 진입");
    console.log(`[DEBUG: DataAnalysisService.ts] filePath: ${filePath}`);
    console.log(`[DEBUG: DataAnalysisService.ts] fileName: ${fileName}`);
    console.log(`[DEBUG: DataAnalysisService.ts] userPrompt: ${userPrompt}`);

    const fileContent = await this.readFileContent(filePath);
    const prompt = this.buildAnalysisPrompt(fileContent, fileName, userPrompt, previousResult);
    return this.chatWithReportOutput(prompt);
  }

  private async readFileContent(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const truncatedContent = content.length > 20000 ? content.substring(0, 20000) : content;
      console.log(`[DEBUG: DataAnalysisService.ts] 파일 읽기 성공. 원본 크기: ${content.length}, 전달 크기: ${truncatedContent.length}`);
      return truncatedContent;
    } catch (error) {
      console.error(`[DEBUG: DataAnalysisService.ts] 파일 읽기 오류:`, error);
      throw new Error(`Failed to read file for analysis.`);
    }
  }

  private buildAnalysisPrompt(
    fileContent: string,
    fileName: string, // [추가] 파일 이름을 받아 프롬프트에 활용
    userPrompt: string,
    previousResult?: string,
  ): string {
    const context = previousResult
      ? "\n# 이전 분석 내용 (참고)\n직전에 다음과 같은 보고서를 생성했습니다. 이 내용을 바탕으로 사용자의 현재 요청에 맞춰 더 구체화하거나 확장된 보고서를 작성해주세요.\n--- 이전 보고서 ---\n${previousResult}\n---"
      : "";

    const prompt = `
# 임무
당신은 데이터 분석 전문가입니다. 당신의 임무는 아래에 제공되는 CSV 파일의 내용만을 사용하여, 사용자의 요청에 맞는 분석 보고서를 작성하는 것입니다.

# 규칙 (매우 중요)
1.  **오직 제공된 CSV 데이터만 사용하세요.** 당신의 사전 지식이나 다른 데이터를 절대 사용해서는 안 됩니다.
2.  분석 대상 파일은 
${fileName}
 입니다. 파일 이름과 아래 데이터 내용을 참고하여 주제를 파악하세요.
3.  데이터의 각 컬럼이 무엇을 의미하는지 먼저 파악하고, 그를 바탕으로 분석을 진행하세요.
4.  만약 데이터의 양이 적거나 분석이 불가능하면, "제공된 데이터만으로는 유의미한 분석을 하기 어렵습니다." 라고 솔직하게 답변하세요.

# 분석 대상 데이터: ${fileName}
\
\
\
csv
${fileContent}
\
\
\

# 사용자 요청사항

"${userPrompt}"

${context}

위 규칙을 반드시 준수하여 보고서를 작성하세요.
`.trim();
    console.log(`[DEBUG: DataAnalysisService.ts] buildAnalysisPrompt 생성 완료:
--- PROMPT START ---
${prompt}
--- PROMPT END ---`);
    return prompt;
  }

  private async chatWithReportOutput(prompt: string): Promise<string> {
    console.log("[DEBUG: DataAnalysisService.ts] chatWithReportOutput 진입");
    const model = this.llm.getGenerativeModel({
      model: this.model,
      systemInstruction: `
You are a data analyst who specializes in writing insightful reports in Korean. Your response must be a well-structured report in Markdown format.

Follow this structure:
1.  **분석 개요 (Analysis Overview):** Briefly describe the purpose and scope of the analysis based on the provided data.
2.  **핵심 인사이트 (Key Insights):** Present the most important findings as bullet points.
3.  **상세 분석 (Detailed Analysis):** Provide a more in-depth explanation of the data and insights.
4.  **결론 및 제안 (Conclusion & Recommendations):** Conclude the report and suggest potential actions or further research.

- The entire report must be in Korean.
- Do not include any text other than the report itself.
      `.trim(),
    });

    try {
      console.log("[DEBUG: DataAnalysisService.ts] model.generateContent 호출 시작...");
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
        },
      });
      const text = result.response.text() ?? "";
      console.log(
          `[DEBUG: DataAnalysisService.ts] LLM으로부터 받은 원본 텍스트 응답 수신 (일부만 표시): 
${text.substring(0, 500)} ...`
      );
      return text;
    } catch (error) {
      console.error("[DEBUG: DataAnalysisService.ts] model.generateContent 호출 중 예외 발생:", error);
      throw error;
    }
  }
}
