import type { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs/promises";

export type DataAnalysisDeps = {
  llm: GoogleGenerativeAI;
  model: string;
};

/**
 * CSV 파일 기반 데이터 분석 서비스
 * - CSV 파일을 읽고 일부 샘플을 AI에게 전달하여 보고서 생성
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
   * @param fileName 분석할 CSV 파일의 이름
   * @param userPrompt 사용자의 구체적인 분석 요청
   * @param previousResult 이전 분석 결과 (선택)
   */
  public async analyzeCsvFile(
      filePath: string,
      fileName: string,
      userPrompt: string = "파일의 내용을 분석하고, 핵심 인사이트를 담은 보고서를 작성해줘.",
      previousResult?: string
  ): Promise<string> {
    console.log("\n[DEBUG] --------------------------------------------------");
    console.log(`[DEBUG] analyzeCsvFile 실행`);
    console.log(`[DEBUG] filePath: ${filePath}`);
    console.log(`[DEBUG] fileName: ${fileName}`);
    console.log(`[DEBUG] userPrompt: ${userPrompt}`);

    const fileContent = await this.readFileContent(filePath);
    const prompt = this.buildAnalysisPrompt(fileContent, fileName, userPrompt, previousResult);
    return this.chatWithReportOutput(prompt);
  }

  /** CSV 파일을 읽고 앞의 몇 줄만 추출하여 반환 */
  private async readFileContent(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split('\n');
      const rowLimit = 21; // 헤더 + 데이터 20줄

      let truncatedContent: string;
      if (lines.length <= rowLimit) {
        truncatedContent = content;
        console.log(`[DEBUG] 파일 읽기 성공. 전체 ${lines.length}줄 전달.`);
      } else {
        truncatedContent = lines.slice(0, rowLimit).join('\n');
        console.log(`[DEBUG] 파일 읽기 성공. 원본 ${lines.length}줄 중 앞의 ${rowLimit}줄 전달.`);
      }
      
      console.log(`--- AI에게 전달되는 CSV 데이터 ---\n${truncatedContent}\n------------------------------------`);

      return truncatedContent;
    } catch (error) {
      console.error("[ERROR] 파일 읽기 실패:", error);
      if (error instanceof Error) {
          throw new Error(`Failed to read file for analysis: ${error.message}`);
      }
      throw new Error(`Failed to read file for analysis.`);
    }
  }

  /** 프롬프트를 구성 */
  private buildAnalysisPrompt(
      fileContent: string,
      fileName: string,
      userPrompt: string,
      previousResult?: string
  ): string {
    const context = previousResult
        ? `
# 이전 분석 내용 (참고)
직전에 생성된 보고서를 참고하여, 사용자의 현재 요청에 맞게 더 구체화하거나 확장하세요.

--- 이전 보고서 ---
${previousResult}
---`
        : "";

    const lines = fileContent.split("\n");
    const header = lines[0] ?? "";
    const columns = header
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

    const columnListMarkdown = columns.map((c) => `- ${c}`).join("\n");

    const prompt = `
# 임무
당신은 데이터 분석 전문가입니다. 아래 제공되는 CSV 파일 내용만을 사용하여, 사용자의 요청에 맞는 분석 보고서를 작성하세요.

# 규칙 (매우 중요)
1. **오직 제공된 CSV 데이터만 사용하세요.** 사전 지식이나 외부 데이터를 절대 사용하지 마세요.
2. 분석 대상 파일: "${fileName}"
3. **다음 컬럼들을 반드시 고려해야 합니다.**
${columnListMarkdown ? columnListMarkdown : "- (헤더 정보 없음)"}
4. 데이터가 부족하거나 분석이 불가능하면, "제공된 데이터만으로는 유의미한 분석을 하기 어렵습니다." 라고 명시하세요.

# 분석 대상 데이터 (${fileName})
${fileContent}

# 사용자 요청사항
"${userPrompt}"

${context}

# 추가 지시사항
- 보고서의 맨 마지막에 "참고: 데이터 샘플" 섹션을 추가하고, 그 안에 제공된 데이터 샘플(처음 5~10개 행)을 보여주는 표를 반드시 포함하세요.
- 이 표는 시스템 프롬프트에서 지시한 JSON 형식을 따라야 합니다.`.trim();

    console.log(`[DEBUG] buildAnalysisPrompt 완료\n--- PROMPT START ---\n${prompt}\n--- PROMPT END ---`);
    return prompt;
  }

  /** AI 모델과 상호작용하여 분석 보고서 생성 */
  private async chatWithReportOutput(prompt: string): Promise<string> {
    console.log("[DEBUG] chatWithReportOutput 진입");

    const model = this.llm.getGenerativeModel({
      model: this.model,
      systemInstruction: `
You are a meticulous Korean data analyst named "Kim".
Always follow formatting instructions perfectly.
Your goal is to generate a well-structured Markdown report.

**CRITICAL OUTPUT RULE:**
- If the report includes a table, format it ONLY as a JSON object within a markdown JSON code block.
- Example:
\`\`\`json
{
  "headers": ["Column 1", "Column 2"],
  "rows": [
    ["Data A1", "Data A2"],
    ["Data B1", "Data B2"]
  ]
}
\`\`\`

Follow this structure:
1. **분석 개요 (Analysis Overview):**
2. **핵심 인사이트 (Key Insights):**
3. **상세 분석 (Detailed Analysis):**
4. **결론 및 제안 (Conclusion & Recommendations):**

- 모든 텍스트는 반드시 한국어로 작성하세요.
- 보고서 외의 불필요한 설명은 절대 포함하지 마세요.
`.trim(),
    });

    try {
      console.log("[DEBUG] model.generateContent 호출 시작...");
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6 },
      });

      const text = result.response.text() ?? "";
      console.log(`[DEBUG] LLM 응답 수신 (앞부분):\n${text.substring(0, 500)} ...`);

      // Log the JSON table data for debugging
      const jsonRegex = /```json\n([\s\S]*?)\n```/;
      const match = text.match(jsonRegex);
      if (match && match[1]) {
          console.log(`--- AI가 생성한 테이블 JSON 데이터 ---\n${match[1]}\n------------------------------------`);
      } else {
          console.log("--- AI 응답에서 테이블 JSON 데이터를 찾지 못했습니다. ---");
      }

      return text;
    } catch (error) {
      console.error("[ERROR] model.generateContent 호출 중 오류:", error);
      throw error;
    }
  }
}