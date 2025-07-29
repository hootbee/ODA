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
                  focusArea: { type: SchemaType.STRING, description: "집중 분석 영역" },
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
      const prompt = `
데이터 정보:
${JSON.stringify(dataInfo)}

${type} 관점에서 analyze_data_utilization 함수를 호출하여 분석해주세요.
집중 분야: ${this.getFocusArea(type, dataInfo.category)}
      `;

      const result = await this.model.generateContent(prompt);
      const response = result.response;

      if (response.functionCalls && response.functionCalls().length > 0) {
        results[type] = await this.processFunctionCall(
          response.functionCalls()[0],
          type,
          dataInfo
        );
      }
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
      business: `비즈니스 활용방안 3가지를 JSON 배열로 제시해주세요: ${JSON.stringify(
        dataInfo
      )}`,
      research: `연구 활용방안 3가지를 JSON 배열로 제시해주세요: ${JSON.stringify(
        dataInfo
      )}`,
      policy: `정책 활용방안 3가지를 JSON 배열로 제시해주세요: ${JSON.stringify(
        dataInfo
      )}`,
      combination: `데이터 결합 제안 3가지를 JSON 배열로 제시해주세요: ${JSON.stringify(
        dataInfo
      )}`,
      tools: `분석 도구 추천 3가지를 JSON 배열로 제시해주세요: ${JSON.stringify(
        dataInfo
      )}`,
    };

    return typePrompts[analysisType as keyof typeof typePrompts] || "";
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

  // 기존 메서드들 유지...
  private async callGenerativeAI(prompt: string): Promise<string> {
    const generationConfig = {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 4096,
      response_mime_type: "application/json",
    };

    const simpleModel = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      generationConfig,
    });

    const result = await simpleModel.generateContent(prompt);
    return result.response.text();
  }

  private parseSpecificAnalysis(response: string, type: string): string[] {
    try {
      console.log(`Raw response for ${type}:`, response);
      const cleaned = response.replace(/``````/g, "").trim();
      const parsed = JSON.parse(cleaned);
      console.log(`Parsed result for ${type}:`, parsed);

      if (!Array.isArray(parsed)) {
        return [];
      }

      switch (type) {
        case "business":
          const businessResult = parsed.map((item: any) => item.business_application || "");
          console.log(`Final business result:`, businessResult);
          return businessResult;
        case "research":
          const researchResult = parsed.map((item: any) => item["연구 활용 방안"] || item["연구_활용_방안"] || "");
          console.log(`Final research result:`, researchResult);
          return researchResult;
        case "policy":
          const policyResult = parsed.map((item: any) => item.활용방안 || "");
          console.log(`Final policy result:`, policyResult);
          return policyResult;
        case "combination":
          const combinationResult = parsed.map((item: any) => item.suggestion || "");
          console.log(`Final combination result:`, combinationResult);
          return combinationResult;
        case "tools":
          const toolsResult = parsed.map((item: any) => item.toolName || item.tool_name || "");
          console.log(`Final tools result:`, toolsResult);
          return toolsResult;
        default:
          const defaultResult = parsed.map((item: any) => item || "");
          console.log(`Final default result:`, defaultResult);
          return defaultResult;
      }
    } catch (error) {
      console.error(`Error parsing ${type} analysis:`, error);
      return [
        `${type} 분석 결과 1`,
        `${type} 분석 결과 2`,
        `${type} 분석 결과 3`,
      ];
    }
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
