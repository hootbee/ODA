// services/DataAnalysisService.ts
import * as fs from "fs/promises";
import * as path from "path";
import * as iconv from "iconv-lite";
import type { GoogleGenerativeAI } from "@google/generative-ai";

export type DataAnalysisDeps = {
    llm: GoogleGenerativeAI; // ✅ Gemini 네이티브 클라이언트
    model: string;           // 예: "gemini-2.5-flash"
};

export class DataAnalysisService {
    constructor(private readonly deps: DataAnalysisDeps) {
        if (!deps?.llm || !deps?.model) {
            throw new Error("DataAnalysisService requires { llm, model }");
        }
    }

    /**
     * EUC-KR CSV를 읽어 일부 라인만 전송하여 요약/분석을 수행한다.
     * 반환값은 LLM이 생성한 한국어 분석 텍스트(마크다운 포함 가능).
     */
    public async analyzeCsvFile(filePath: string): Promise<string> {
        try {
            // 1) 파일 읽기 (버퍼)
            const fileBuffer = await fs.readFile(filePath);

            // 2) EUC-KR → UTF-8 디코딩
            const decodedCsvData = iconv.decode(fileBuffer, "euc-kr");

            // 3) 효율을 위해 선두 N라인만 사용
            const lines = decodedCsvData.split("\n");
            const partialData = lines.slice(0, 10).join("\n");

            // 4) 프롬프트 구성
            const prompt = `
당신은 CSV 데이터를 분석하여 보고서를 작성하는 최고의 데이터 분석 전문가입니다.
주어진 CSV 데이터의 일부를 보고, 아래 지시사항에 따라 **한국어로** 상세한 분석 보고서를 작성해주세요.

### 분석할 CSV 데이터 (일부)
\`\`\`csv
${partialData}
\`\`\`

### 보고서에 반드시 포함할 4가지 항목:

1. **데이터 요약:**  
   이 데이터가 무엇에 대한 내용인지 한두 문장으로 요약.

2. **핵심 인사이트(2~3가지):**  
   헤더와 내용을 바탕으로 중요한 경향/패턴/특이점.

3. **잠재적 활용 방안:**  
   이 데이터를 활용한 비즈니스 모델 또는 공공 정책 아이디어.

4. **데이터 구조 예시 (JSON 형식):**  
   헤더(첫 줄)와 실제 데이터 3줄을 아래 예시처럼 JSON으로 제시. JSON은 반드시 코드블록(\`\`\`json)으로 감싸주세요.
   {
     "headers": ["헤더1", "헤더2", ...],
     "rows": [
       ["데이터1-1", "데이터1-2", ...],
       ["데이터2-1", "데이터2-2", ...],
       ["데이터3-1", "데이터3-2", ...]
     ]
   }
`.trim();

            // 5) LLM 호출 (Gemini 네이티브)
            const model = this.deps.llm.getGenerativeModel({
                model: this.deps.model,
                systemInstruction:
                    "You are a helpful data analyst. Respond in Korean. Keep structure clear and concise.",
            });

            const resp = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }]}],
                generationConfig: {
                    temperature: 0.3,
                    // 분석 결과는 마크다운 포함 텍스트여서 JSON 강제는 사용하지 않음
                },
            });

            const text = resp.response.text() ?? "";
            if (!text.trim()) return "분석 결과가 비어 있습니다.";
            return text;
        } catch (error) {
            console.error("Error during data analysis:", error);
            throw new Error("Failed to analyze CSV data with LLM.");
        }
    }
}