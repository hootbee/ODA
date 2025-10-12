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
    const raw = await this.chatWithReportOutput(prompt);

    // 안전장치: 모델이 실수로 마크다운 표를 만들었을 때 JSON으로 자동 변환
    const normalized = this.ensureJsonTables(raw, fileContent);
    return normalized;
  }

  /** CSV 파일을 읽고 앞의 몇 줄만 추출하여 반환 */
  private async readFileContent(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n");
      const rowLimit = 21; // 헤더 + 데이터 20줄

      let truncatedContent: string;
      if (lines.length <= rowLimit) {
        truncatedContent = content;
        console.log(`[DEBUG] 파일 읽기 성공. 전체 ${lines.length}줄 전달.`);
      } else {
        truncatedContent = lines.slice(0, rowLimit).join("\n");
        console.log(`[DEBUG] 파일 읽기 성공. 원본 ${lines.length}줄 중 앞의 ${rowLimit}줄 전달.`);
      }

      console.log(`--- AI에게 전달되는 CSV 데이터 ---\n${truncatedContent}\n------------------------------------`);
      return truncatedContent;
    } catch (error: any) {
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

# 추가 지시사항 (엄격)
- 보고서 내 표는 **절대 마크다운 표를 사용하지 말고**, **오직 JSON 코드블록(\`\`\`json ... \`\`\`)**만 사용하세요.
- **본문 중간 요약 표는 최대 3개**, 각 표는 대표 행 **3~5개 내외**로 제한하세요. (중복 성격 표는 생략)
- **마지막 "참고: 데이터 샘플" 표는 원본 CSV의 모든 컬럼을 포함**하되, 행은 처음 **3~5행**만 포함하세요.
- 모든 JSON 표는 다음 스키마만 사용합니다.

\`\`\`json
{
  "headers": ["Column 1", "Column 2", "..."],
  "rows": [
    ["R1C1", "R1C2", "..."],
    ["R2C1", "R2C2", "..."]
  ]
}
\`\`\`

# 나쁜 예(금지)
| A | B |
|---|---|
| 1 | 2 |

# 좋은 예(허용)
\`\`\`json
{"headers":["A","B"],"rows":[["1","2"]]}
\`\`\`
`.trim();

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
Your goal is to generate a well-structured Markdown report in Korean.

CRITICAL OUTPUT RULES:
- 표가 필요할 때는 오직 아래 JSON 테이블 스키마를 **마크다운 코드블록(\`\`\`json ... \`\`\`)**으로 삽입하세요.
- 본문 중간 예시는 **최대 2개**, 각 **최대 5행(rows)**.
- 마지막 "참고: 데이터 샘플" 섹션에는 **모든 컬럼(headers 전부)**을 포함하고 **5~10행(rows)**을 넣으세요.
- JSON 외의 표(파이프 테이블 등)는 절대 사용하지 마세요.

JSON TABLE SCHEMA (반드시 이 형태):
\`\`\`json
{
  "headers": ["Col 1", "Col 2", "..."],
  "rows": [
    ["R1C1", "R1C2", "..."],
    ["R2C1", "R2C2", "..."]
  ]
}
\`\`\`

REPORT STRUCTURE (항상 이 순서):
1. **분석 개요**
   - 데이터의 목적, 주요 변수, 분석 범위를 간결히 요약합니다.
2. **핵심 인사이트**
   - 데이터에서 가장 두드러진 특징, 패턴, 이상치, 상관관계를 요약합니다.
3. **상세 분석**
   - 주요 지표별, 카테고리별, 시점별 분석을 수행합니다.
   - 필요한 지점에서 **소규모 JSON 테이블(5행 이하)**을 삽입합니다.
4. **결론 및 제안**
   - 분석 결과를 기반으로 **정책적·전략적·운영적·비즈니스적·시스템 개선** 등 다양한 관점에서 **활용 가능한 제안**을 자유롭게 작성하세요.
   - 예시: 효율성 개선, 수요 예측, 품질 관리, 고객 만족, 지역 경제, 인프라 개선, 마케팅 전략, 환경 정책 등
   - 즉, 특정 주제(예: 주차, 축제, 경제 등)에 구속되지 않고 **데이터 성격에 맞는 실질적 활용 방안**을 작성하세요.
5. **참고: 데이터 샘플**
   - 제공 CSV의 **모든 컬럼을 headers로 포함**하고, **5~10행(rows)**만 담은 **JSON 테이블**을 반드시 1개 삽입하세요.

추가 규칙:
- 외부 지식/데이터 사용 금지. 제공 CSV만 사용.
- 데이터가 부족하면 그 사실을 명확히 고지.
- 불필요한 서론/사족 금지. 간결하고 근거 중심.
`.trim(),
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6 },
    });

    const text = result.response.text() ?? "";
    console.log(`[DEBUG] LLM 응답 수신 (앞부분):\n${text.substring(0, 500)} ...`);
    return text;
  }

  /**
   *  안전장치:
   *  - 모델이 실수로 마크다운 표를 생성한 경우를 JSON 코드블록으로 자동 변환
   *  - JSON 코드블록이 이미 있으면 그대로 유지
   */
  private ensureJsonTables(text: string, fileContent: string): string {
    const hasJsonBlocks = /```json[\s\S]*?```/i.test(text);
    let out = text;

    if (!hasJsonBlocks) {
      // 마크다운 표(헤더/구분선/데이터행) 탐지 후 JSON으로 치환
      out = this.convertMarkdownTablesToJson(out);
    } else {
      // 그래도 혹시 섞여 있는 경우 추가 변환 시도(중복 변환 방지 위해 JSON 블록은 건드리지 않음)
      out = this.convertMarkdownTablesToJson(out);
    }

    // 마지막 “참고: 데이터 샘플”에 모든 컬럼 포함했는지 강제하기는 어려우므로
    // 최소한 표가 하나는 있도록 보정(없다면 CSV 헤더 기반 3~5행 생성)
    const stillNoJson = !/```json[\s\S]*?```/i.test(out);
    if (stillNoJson) {
      const lines = fileContent.trim().split("\n");
      if (lines.length >= 2) {
        const headers = lines[0].split(",").map((s) => s.trim());
        const rows = lines.slice(1, Math.min(lines.length, 6)).map((r) =>
            r.split(",").map((s) => s.trim())
        );
        const fallback = [
          "\n\n### 참고: 데이터 샘플\n",
          "```json",
          JSON.stringify({ headers, rows }, null, 2),
          "```",
        ].join("\n");
        out = out + fallback;
      }
    }

    return out;
  }

  /** 마크다운 표(|---|)를 JSON 코드블록으로 변환 (간단 케이스 지원) */
  private convertMarkdownTablesToJson(text: string): string {
    const lines = text.split("\n");
    const result: string[] = [];
    let i = 0;

    const isSeparator = (s: string) =>
        /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*$/.test(s);

    while (i < lines.length) {
      const line = lines[i];

      // 표 헤더 후보: 파이프 포함
      if (/\|/.test(line)) {
        const headerLine = line;
        const sepLine = lines[i + 1] ?? "";

        if (isSeparator(sepLine)) {
          // 표 블록 수집
          const body: string[] = [];
          let j = i + 2;
          while (j < lines.length && /\|/.test(lines[j])) {
            body.push(lines[j]);
            j++;
          }

          // 파싱
          const toCells = (row: string) =>
              row
                  .trim()
                  .replace(/^\|/, "")
                  .replace(/\|$/, "")
                  .split("|")
                  .map((c) => c.trim());

          const headers = toCells(headerLine);
          const rows = body.map(toCells);

          // JSON 코드블록으로 치환
          result.push("```json");
          result.push(JSON.stringify({ headers, rows }, null, 2));
          result.push("```");

          i = j;
          continue;
        }
      }

      // 표가 아니면 그대로
      result.push(line);
      i++;
    }

    return result.join("\n");
  }
}