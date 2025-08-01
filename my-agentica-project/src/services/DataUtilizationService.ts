// services/DataUtilizationService.ts
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export class DataUtilizationService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    // Gemini Function Calling 설정
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      tools: [
        {
          functionDeclarations: [
            {
              name: "analyze_data_utilization",
              description: "공공데이터의 활용방안을 종합적으로 분석합니다",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  analysisType: {
                    type: SchemaType.STRING,
                    enum: [
                      "business",
                      "research",
                      "policy",
                      "combination",
                      "tools",
                    ],
                    description: "분석 유형",
                    format: "enum",
                  },
                  dataInfo: {
                    type: SchemaType.OBJECT,
                    properties: {
                      fileName: { type: SchemaType.STRING },
                      title: { type: SchemaType.STRING },
                      category: { type: SchemaType.STRING },
                      keywords: { type: SchemaType.STRING },
                      description: { type: SchemaType.STRING },
                      providerAgency: { type: SchemaType.STRING },
                    },
                    required: ["title", "category"],
                  },
                  focusArea: {
                    type: SchemaType.STRING,
                    description: "집중 분석 영역",
                  },
                },
                required: ["analysisType", "dataInfo"],
              },
            },
          ],
        },
      ],
    });
  }

  /**
   * Agentica와 호환되는 데이터 활용 방안 생성
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
    console.log(
      `🔍 Agentica + Gemini Function Calling 활용 추천 생성: ${dataInfo.fileName}`
    );

    try {
      // Function Calling을 통한 단계별 분석
      const results = await this.executeAgenticAnalysis(dataInfo);
      return this.formatResults(results);
    } catch (error) {
      console.error("Agentica 분석 중 오류:", error);
      return this.getDefaultRecommendations();
    }
  }

  /**
   * 단일 데이터 활용 방안 생성 ✅ 수정됨: 유연한 프롬프트 및 카테고리 기반 분기 처리
   */
  public async generateSingleRecommendation(
    dataInfo: any,
    analysisTypeOrPrompt: string // "business" 같은 카테고리 또는 사용자 전체 프롬프트
  ): Promise<string[]> {
    const predefinedTypes = ["business", "research", "policy", "combination", "tools"];

    // 입력이 미리 정의된 카테고리 중 하나인지 확인
    if (predefinedTypes.includes(analysisTypeOrPrompt)) {
      // 기존 로직: 카테고리 기반 분석 (전체 활용방안 기능에 필요)
      console.log(
        `[DataUtilizationService] 카테고리 기반 단일 활용 추천 생성: ${dataInfo.fileName} (${analysisTypeOrPrompt})`
      );
      return this.executeSingleAgenticAnalysis(dataInfo, analysisTypeOrPrompt);
    } else {
      // 새로운 로직: 사용자 프롬프트 기반의 유연한 분석
      console.log(
        `[DataUtilizationService] 유연한 단일 활용 추천 생성: ${dataInfo.fileName}`
      );
      const detailedPrompt = this.buildFlexibleDetailedPrompt(dataInfo, analysisTypeOrPrompt);
      const result = await this.callGenerativeAI(detailedPrompt);
      return this.parseSpecificAnalysis(result, "사용자 맞춤 활용 방안");
    }
  }

  /**
   * Agentica 스타일의 단일 분석 실행
   */
  private async executeSingleAgenticAnalysis(
    dataInfo: any,
    analysisType: string
  ): Promise<string[]> {
    const prompt = `
데이터 정보:
${JSON.stringify(dataInfo)}

${analysisType} 관점에서 analyze_data_utilization 함수를 호출하여 분석해주세요.
집중 분야: ${this.getFocusArea(analysisType, dataInfo.category)}
    `;

    const result = await this.model.generateContent(prompt);
    const response = result.response;

    if (response.functionCalls && response.functionCalls().length > 0) {
      return await this.processFunctionCall(
        response.functionCalls()[0],
        analysisType,
        dataInfo
      );
    }
    return [];
  }

  /**
   * Agentica 스타일의 단계별 분석 실행
   */
  private async executeAgenticAnalysis(dataInfo: any) {
    const analysisTypes = [
      "business",
      "research",
      "policy",
      "combination",
      "tools",
    ];
    const results: any = {};

    for (const type of analysisTypes) {
      results[type] = await this.executeSingleAgenticAnalysis(dataInfo, type);
    }

    return results;
  }

  /**
   * Function Call 처리
   */
  private async processFunctionCall(
    functionCall: any,
    analysisType: string,
    dataInfo: any
  ) {
    const { args } = functionCall;

    const detailedPrompt = this.buildDetailedPrompt(analysisType, dataInfo);
    const result = await this.callGenerativeAI(detailedPrompt);

    return this.parseSpecificAnalysis(result, analysisType);
  }

  /**
   * 분석 유형별 상세 프롬프트 생성
   */
  private buildDetailedPrompt(analysisType: string, dataInfo: any): string {
    const typePrompts = {
      business: `다음 공공데이터의 비즈니스 활용방안 3가지를 JSON 배열 형식으로 제시해주세요.
각 항목은 구체적이고 실현 가능한 비즈니스 아이디어여야 합니다.

데이터 정보: ${JSON.stringify(dataInfo)}

응답 형식: ["비즈니스 아이디어 1", "비즈니스 아이디어 2", "비즈니스 아이디어 3"]`,

      research: `다음 공공데이터의 연구 활용방안 3가지를 JSON 배열 형식으로 제시해주세요.
각 항목은 학술적 가치가 있는 연구 주제여야 합니다.

데이터 정보: ${JSON.stringify(dataInfo)}

응답 형식: ["연구 주제 1", "연구 주제 2", "연구 주제 3"]`,

      policy: `다음 공공데이터의 정책 활용방안 3가지를 JSON 배열 형식으로 제시해주세요.
각 항목은 정부나 공공기관에서 활용할 수 있는 정책 아이디어여야 합니다.

데이터 정보: ${JSON.stringify(dataInfo)}

응답 형식: ["정책 아이디어 1", "정책 아이디어 2", "정책 아이디어 3"]`,

      combination: `다음 공공데이터와 결합하면 시너지를 낼 수 있는 다른 데이터 3가지를 JSON 배열 형식으로 제시해주세요.
각 항목은 구체적인 데이터 종류와 결합 효과를 포함해야 합니다.

데이터 정보: ${JSON.stringify(dataInfo)}

응답 형식: ["결합 데이터 1", "결합 데이터 2", "결합 데이터 3"]`,

      tools: `다음 공공데이터를 분석하고 시각화하는데 적합한 도구 3가지를 JSON 배열 형식으로 제시해주세요.
각 항목은 구체적인 도구명과 활용 방법을 포함해야 합니다.

데이터 정보: ${JSON.stringify(dataInfo)}

응답 형식: ["분석 도구 1", "분석 도구 2", "분석 도구 3"]`,
    };

    return typePrompts[analysisType as keyof typeof typePrompts] || "";
  }

  /**
   * ✅ 새로 추가된 유연한 프롬프트 빌더
   */
  private buildFlexibleDetailedPrompt(dataInfo: any, userPrompt: string): string {
    const prompt = `
당신은 데이터 분석 및 활용 전략 전문가입니다. 주어진 공공데이터 정보와 사용자의 구체적인 요청을 바탕으로, 실행 가능하고 창의적인 데이터 활용 방안 3가지를 제안해주세요.

### 공공데이터 정보:
- **데이터명**: ${dataInfo.title || dataInfo.fileName}
- **제공 기관**: ${dataInfo.providerAgency || '정보 없음'}
- **데이터 분류**: ${dataInfo.category || '정보 없음'}
- **키워드**: ${dataInfo.keywords || '정보 없음'}
- **상세 설명**: ${dataInfo.description || '정보 없음'}

### 사용자의 구체적인 요청:
"${userPrompt}"

### 지시사항:
1.  사용자의 요청을 깊이 이해하고, 요청의 핵심 의도에 정확히 부합하는 답변을 생성하세요.
2.  제안하는 아이디어는 구체적이고, 현실적으로 실행 가능해야 합니다.
3.  각 아이디어는 2-3문장으로 상세히 설명해주세요.
4.  결과는 반드시 JSON 문자열 배열(string array) 형식으로 반환해주세요.

### 응답 형식 예시:
[
  "첫 번째 활용 방안: (구체적인 설명)",
  "두 번째 활용 방안: (구체적인 설명)",
  "세 번째 활용 방안: (구체적인 설명)"
]
`;
    console.log("[DataUtilizationService] 생성된 유연한 상세 프롬프트:", prompt);
    return prompt;
  }

  private getFocusArea(type: string, category: string): string {
    const focusMap = {
      business: `${category} 분야의 수익 창출`,
      research: `${category} 관련 학술 연구`,
      policy: `${category} 정책 개선`,
      combination: `${category} 데이터 융합`,
      tools: `${category} 데이터 분석`,
    };
    return focusMap[type as keyof typeof focusMap] || category;
  }

  /**
   * Generative AI 호출
   */
  private async callGenerativeAI(prompt: string): Promise<string> {
    const generationConfig = {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 4096,
      responseMimeType: "application/json", // ✅ 수정: response_mime_type → responseMimeType
    };

    const simpleModel = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      generationConfig,
    });

    const result = await simpleModel.generateContent(prompt);
    return result.response.text();
  }

  /**
   * ✅ 방법 2: 유연하고 강력한 응답 파싱 로직
   */
  private parseSpecificAnalysis(response: string, type: string): string[] {
    try {
      console.log(`🔍 Raw response for ${type}:`, response);

      // JSON 정리
      const cleaned = response.replace(/``````/g, "").trim();
      let parsed;

      // JSON 파싱 시도
      try {
        parsed = JSON.parse(cleaned);
      } catch (jsonError) {
        console.error(`❌ JSON parsing error for ${type}:`, jsonError);

        // JSON 파싱 실패 시 배열 패턴 추출 시도
        const arrayMatch = cleaned.match(/\[[\s\S]*?\]/);
        if (arrayMatch && arrayMatch[0]) {
          try {
            parsed = JSON.parse(arrayMatch[0]);
          } catch (innerJsonError) {
            console.error(
              `❌ Inner JSON parsing error for ${type}:`,
              innerJsonError
            );
            return [`${type} 분석 중 파싱 오류가 발생했습니다.`];
          }
        } else {
          return [`${type} 분석 중 JSON 형식을 찾을 수 없습니다.`];
        }
      }

      console.log(`✅ Parsed result for ${type}:`, parsed);

      // 배열이 아닌 경우 처리
      if (!Array.isArray(parsed)) {
        if (typeof parsed === "object" && parsed !== null) {
          // 객체 내부에서 배열 찾기
          for (const key in parsed) {
            if (Array.isArray(parsed[key])) {
              parsed = parsed[key];
              break;
            }
          }

          // 여전히 배열이 아니면 객체를 배열로 변환
          if (!Array.isArray(parsed)) {
            return [`${type} 분석: ${JSON.stringify(parsed)}`];
          }
        } else {
          return [`${type} 분석 결과를 배열로 변환할 수 없습니다.`];
        }
      }

      // ✅ 유연한 매핑: 객체의 모든 값을 조합하여 의미있는 문자열 생성
      const results = parsed.map((item: any, index: number) => {
        // 이미 문자열인 경우
        if (typeof item === "string" && item.trim().length > 0) {
          return item.trim();
        }

        // 객체인 경우 값들을 조합
        if (typeof item === "object" && item !== null) {
          const values = Object.values(item)
            .filter((val) => typeof val === "string" && val.trim().length > 0)
            .map((val) => (val as string).trim());

          if (values.length >= 2) {
            // "활용분야: 세부내용" 형식으로 조합
            return `${values[0]}: ${values.slice(1).join(" ")}`;
          } else if (values.length === 1) {
            return values[0];
          } else {
            // 값이 없으면 키-값 쌍을 문자열로 변환
            const keyValuePairs = Object.entries(item)
              .filter(
                ([key, value]) =>
                  typeof value === "string" && value.trim().length > 0
              )
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ");

            return keyValuePairs || JSON.stringify(item);
          }
        }

        // 기타 타입의 경우
        if (item !== null && item !== undefined) {
          return String(item);
        }

        // 마지막 폴백
        return `${this.getAnalysisTypeKorean(type)} ${index + 1}`;
      });

      // 빈 결과 필터링 및 최종 검증
      const filteredResults = results.filter(
        (result) =>
          result && typeof result === "string" && result.trim().length > 0
      );

      if (filteredResults.length === 0) {
        return [
          `${this.getAnalysisTypeKorean(type)} 1`,
          `${this.getAnalysisTypeKorean(type)} 2`,
          `${this.getAnalysisTypeKorean(type)} 3`,
        ];
      }

      console.log(`🎯 Final ${type} result:`, filteredResults);
      return filteredResults;
    } catch (error) {
      console.error(`💥 Error parsing ${type} analysis:`, error);
      return [
        `${this.getAnalysisTypeKorean(type)} 분석 중 오류 발생`,
        `오류 내용: ${error instanceof Error ? error.message : String(error)}`,
        `기본 ${this.getAnalysisTypeKorean(type)} 방안`,
      ];
    }
  }

  /**
   * 분석 타입을 한국어로 변환
   */
  private getAnalysisTypeKorean(type: string): string {
    const typeMap = {
      business: "비즈니스 활용방안",
      research: "연구 활용방안",
      policy: "정책 활용방안",
      combination: "데이터 결합 제안",
      tools: "분석 도구 추천",
    };
    return typeMap[type as keyof typeof typeMap] || `${type} 분석`;
  }

  private formatResults(results: any) {
    return {
      businessApplications: results.business || [],
      researchApplications: results.research || [],
      policyApplications: results.policy || [],
      combinationSuggestions: results.combination || [],
      analysisTools: results.tools || [],
    };
  }

  private getDefaultRecommendations() {
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
