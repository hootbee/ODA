// services/DataUtilizationService.ts
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

const MODEL_NAME = "gemini-2.0-flash-lite";

export class DataUtilizationService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY is not set in the environment variables."
      );
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  /**
   * 데이터 활용 방안 생성
   */
  public async generateRecommendations(dataInfo: {
    fileName: string;
    title: string;
    category: string;
    keywords: string;
    description: string;
    providerAgency: string;
  }): Promise<{
    businessApplications: string[];
    researchApplications: string[];
    policyApplications: string[];
    combinationSuggestions: string[];
    analysisTools: string[];
  }> {
    console.log(`🔍 AI 활용 추천 생성 중: ${dataInfo.fileName}`);

    const prompt = this.buildUtilizationPrompt(dataInfo);

    try {
      const aiResponse = await this.callGenerativeAI(prompt);
      const recommendations = this.parseRecommendations(aiResponse);
      return recommendations;
    } catch (error) {
      console.error("AI 응답 생성 중 오류 발생:", error);
      // 오류 발생 시 기본 추천값 반환
      return this.getDefaultRecommendations();
    }
  }

  /**
   * 프롬프트 구성
   */
  private buildUtilizationPrompt(dataInfo: any): string {
    return `
다음 공공데이터의 활용 방안을 분석하고, 지정된 JSON 형식에 맞춰 구체적이고 창의적인 아이디어를 제시해주세요.

### 데이터 정보
- **파일명**: ${dataInfo.fileName}
- **제목**: ${dataInfo.title}
- **분류**: ${dataInfo.category}
- **키워드**: ${dataInfo.keywords}
- **제공기관**: ${dataInfo.providerAgency}
- **설명**: ${dataInfo.description}

### 요청사항
1.  **비즈니스 활용 방안 (businessApplications)**: 이 데이터를 활용하여 수익을 창출할 수 있는 구체적인 사업 아이템 3가지를 제안해주세요. (예: '빅데이터 기반 상권 분석 서비스', '맞춤형 광고 플랫폼')
2.  **연구 활용 방안 (researchApplications)**: 학술적 또는 기술적 관점에서 이 데이터를 활용할 수 있는 연구 주제 3가지를 제안해주세요. (예: '기계학습을 이용한 교통량 예측 모델 개발', '사회적 약자 이동 패턴 분석')
3.  **정책 활용 방안 (policyApplications)**: 정부나 공공기관이 이 데이터를 활용하여 사회 문제를 해결하거나 행정 효율을 높일 수 있는 정책 아이디어 3가지를 제안해주세요. (예: '데이터 기반의 교통 신호 최적화', '범죄 취약 지역 순찰 강화')
4.  **데이터 결합 제안 (combinationSuggestions)**: 이 데이터의 가치를 높이기 위해 함께 활용하면 시너지를 낼 수 있는 다른 종류의 데이터 3가지를 제안해주세요. (예: '유동인구 데이터', '소셜 미디어 데이터', '기상 데이터')
5.  **추천 분석 도구 (analysisTools)**: 이 데이터를 분석하고 시각화하는 데 가장 적합한 도구나 기술 3가지를 추천해주세요. (예: 'Python (Pandas, Geopandas)', 'Tableau', 'QGIS')

### 출력 형식 (JSON)
반드시 다음의 JSON 형식으로만 응답해주세요. 다른 설명은 포함하지 마세요.
\`\`\`json
{
  "businessApplications": ["아이디어 1", "아이디어 2", "아이디어 3"],
  "researchApplications": ["연구 주제 1", "연구 주제 2", "연구 주제 3"],
  "policyApplications": ["정책 아이디어 1", "정책 아이디어 2", "정책 아이디어 3"],
  "combinationSuggestions": ["데이터 종류 1", "데이터 종류 2", "데이터 종류 3"],
  "analysisTools": ["도구 1", "도구 2", "도구 3"]
}
\`\`\`
`;
  }

  /**
   * Generative AI 호출 (재시도 및 백오프 로직 추가)
   */
  private async callGenerativeAI(
    prompt: string,
    maxRetries = 3,
    initialDelay = 2000
  ): Promise<string> {
    console.log("🤖 Gemini AI 모델 호출 중...");
    let lastError: any;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const generationConfig = {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096,
          response_mime_type: "application/json",
        };

        const safetySettings = [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          // ... (다른 안전 설정 추가 가능)
        ];

        const model = this.genAI.getGenerativeModel({
          model: MODEL_NAME,
          generationConfig,
          safetySettings,
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        console.log("✅ Gemini AI 응답 수신");
        return responseText;
      } catch (error: any) {
        lastError = error;
        if (error.status === 429) {
          const retryDelayStr = error.errorDetails?.find(
            (d: any) =>
              d["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
          )?.retryDelay;

          let delay = initialDelay * Math.pow(2, i);

          if (retryDelayStr) {
            const seconds = parseInt(retryDelayStr.replace("s", ""), 10);
            if (!isNaN(seconds)) {
              delay = seconds * 1000;
            }
          }

          console.warn(
            `🚦 429 Too Many Requests. ${
              i + 1
            }번째 재시도... ${delay}ms 후 다시 시도합니다.`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // 429가 아닌 다른 오류는 즉시 throw
          throw error;
        }
      }
    }
    // 모든 재시도 실패 시 마지막 오류 throw
    console.error("모든 재시도 실패. 마지막 오류:", lastError);
    throw lastError;
  }

  /**
   * AI 응답 파싱
   */
  private parseRecommendations(aiResponse: string): any {
    try {
      // JSON 형식의 문자열을 직접 파싱
      const cleanedResponse = aiResponse
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(cleanedResponse);
      console.log("✅ JSON 파싱 성공");
      return parsed;
    } catch (error) {
      console.error("AI 응답 파싱 실패:", error);
      console.log("원본 응답:", aiResponse);
      // 파싱 실패 시 기본값 반환
      return this.getDefaultRecommendations();
    }
  }

  /**
   * 기본 추천값 반환 (오류 발생 시)
   */
  private getDefaultRecommendations(): any {
    return {
      businessApplications: [
        "데이터 기반 비즈니스 모델 개발",
        "관련 분야 컨설팅 서비스 제공",
        "정부 사업 입찰 참여 시 활용",
      ],
      researchApplications: [
        "현황 분석 및 트렌드 연구",
        "정책 효과성 분석 연구",
        "지역별 비교 분석 연구",
      ],
      policyApplications: [
        "정책 수립 시 근거 자료로 활용",
        "예산 배정 및 우선순위 결정",
        "성과 측정 및 평가 지표 개발",
      ],
      combinationSuggestions: [
        "인구 통계 데이터와 결합 분석",
        "경제 지표와 상관관계 분석",
        "지리 정보와 공간 분석",
      ],
      analysisTools: [
        "Excel 및 Google Sheets 활용",
        "Python (pandas, matplotlib)",
        "R 통계 분석 및 시각화",
      ],
    };
  }
}
