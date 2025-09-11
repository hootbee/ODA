// services/DataUtilizationService.ts
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// 새로운 데이터 구조에 대한 인터페이스 정의
interface UtilizationIdea {
  title: string;
  description: string;
  effect: string; // 기대효과만 포함
}

export class DataUtilizationService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
                      "social_problem", // ✅ 수정된 카테고리
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

  public async generateRecommendations(dataInfo: {
    fileName: string;
    title: string;
    category: string;
    keywords: string;
    description: string;
    providerAgency: string;
  }): Promise<{ 
    businessApplications: UtilizationIdea[];
    researchApplications: UtilizationIdea[];
    policyApplications: UtilizationIdea[];
    socialProblemApplications: UtilizationIdea[]; // ✅ 수정된 카테고리
  }> {
    console.log(
      `🔍 Agentica + Gemini Function Calling 활용 추천 생성: ${dataInfo.fileName}`
    );

    try {
      const results = await this.executeAgenticAnalysis(dataInfo);
      return this.formatResults(results);
    } catch (error) {
      console.error("Agentica 분석 중 오류:", error);
      return this.getDefaultRecommendations();
    }
  }

  public async generateSingleRecommendation(
    dataInfo: any,
    analysisTypeOrPrompt: string
  ): Promise<any> {
    const predefinedTypes = [
      "business",
      "research",
      "policy",
      "social_problem", // ✅ 수정된 카테고리
    ];

    if (predefinedTypes.includes(analysisTypeOrPrompt)) {
      return this.executeSingleAgenticAnalysis(
        dataInfo,
        analysisTypeOrPrompt
      );
    } else {
      const detailedPrompt = this.buildFlexibleDetailedPrompt(
        dataInfo,
        analysisTypeOrPrompt
      );
      const result = await this.callGenerativeAI(detailedPrompt);
      const recommendations = this.parseSpecificAnalysis(result, "사용자 맞춤 활용 방안");
      return { type: "simple_recommendation", recommendations };
    }
  }

  private async executeSingleAgenticAnalysis(
    dataInfo: any,
    analysisType: string
  ): Promise<UtilizationIdea[]> {
    const prompt = `
데이터 정보: ${JSON.stringify(dataInfo)}

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

  private async executeAgenticAnalysis(dataInfo: any) {
    const analysisTypes = [
      "business",
      "research",
      "policy",
      "social_problem", // ✅ 수정된 카테고리
    ];
    const results: any = {};
    for (const type of analysisTypes) {
      results[type] = await this.executeSingleAgenticAnalysis(dataInfo, type);
    }
    return results;
  }

  private async processFunctionCall(
    functionCall: any,
    analysisType: string,
    dataInfo: any
  ) {
    const detailedPrompt = this.buildDetailedPrompt(analysisType, dataInfo);
    const result = await this.callGenerativeAI(detailedPrompt);
    return this.parseSpecificAnalysis(result, analysisType);
  }

  private buildDetailedPrompt(analysisType: string, dataInfo: any): string {
    const basePrompt = `다음 공공데이터의 활용방안 2가지를 JSON 배열 형식으로 제시해주세요.
각 항목은 다음 JSON 구조를 반드시 따라야 합니다:
{
  "title": "활용 아이디어 제목",
  "description": "아이디어에 대한 1-2 문장의 간결한 설명",
  "effect": "기대 효과 (예: 20% 충전 인프라 부족 해소)"
}

데이터 정보: ${JSON.stringify(
      dataInfo
    )}
`;

    const formatInstruction = `
응답 형식:
[
  {
    "title": "아이디어 1",
    "description": "설명...",
    "effect": "기대 효과..."
  },
  {
    "title": "아이디어 2",
    "description": "설명...",
    "effect": "기대 효과..."
  }
]`;

    const typePrompts = {
      business: `비즈니스 관점에서의 ${basePrompt}${formatInstruction}`,
      research: `연구 관점에서의 ${basePrompt}${formatInstruction}`,
      policy: `정책 관점에서의 ${basePrompt}${formatInstruction}`,
      social_problem: `사회문제 해결 관점에서의 ${basePrompt}${formatInstruction}`,
    };

    return typePrompts[analysisType as keyof typeof typePrompts] || "";
  }

  private buildFlexibleDetailedPrompt(
    dataInfo: any,
    userPrompt: string
  ): string {
    const prompt = `
당신은 데이터 분석 및 활용 전략 전문가입니다. 주어진 공공데이터 정보와 사용자의 구체적인 요청을 바탕으로, 실행 가능하고 창의적인 데이터 활용 방안을 제안해주세요.

### 사용자의 구체적인 요청:
"${userPrompt}"

### 지시사항:
1.  결과는 아래에 명시된 JSON 구조를 따르는 객체들의 배열 형식으로 반환해주세요.
2.  각 아이디어는 'title', 'description', 'effect' 필드를 포함해야 합니다.
    - **title**: 활용 아이디어의 핵심 제목
    - **description**: 아이디어에 대한 상세한 설명 (2-3문장)
    - **effect**: 예상되는 기대 효과

### 응답 형식 (JSON):
[
  {
    "title": "사용자 맞춤형 아이디어 1",
    "description": "아이디어에 대한 구체적이고 상세한 설명입니다...",
    "effect": "상세한 기대 효과 (예: 특정 지표 20% 개선)"
  }
]
`;
    return prompt;
  }

  private getFocusArea(type: string, category: string): string {
    const focusMap = {
      business: `${category} 분야의 수익 창출`,
      research: `${category} 관련 학술 연구`,
      policy: `${category} 정책 개선`,
      social_problem: `${category} 관련 사회문제 해결`,
    };
    return focusMap[type as keyof typeof focusMap] || category;
  }

  private async callGenerativeAI(prompt: string): Promise<string> {
    const generationConfig = {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    };
    const simpleModel = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      generationConfig,
    });
    const result = await simpleModel.generateContent(prompt);
    return result.response.text();
  }

  private parseSpecificAnalysis(response: string, type: string): any[] {
    try {
      const cleaned = response.replace(/```json|```/g, "").trim();
      let parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) {
        return [{ title: "형식 오류", description: "AI 응답이 배열 형식이 아닙니다.", effect: "" }];
      }
      const results = parsed.filter(
        (item: any) => item && item.title && item.description && item.effect
      );
      if (results.length === 0) {
        return [
          { title: `${this.getAnalysisTypeKorean(type)} 1`, description: "생성된 추천 내용이 없습니다.", effect: "" },
          { title: `${this.getAnalysisTypeKorean(type)} 2`, description: "생성된 추천 내용이 없습니다.", effect: "" },
        ];
      }
      return results;
    } catch (error) {
      return [
        {
          title: `${this.getAnalysisTypeKorean(type)} 분석 중 오류 발생`,
          description: `오류 내용: ${error instanceof Error ? error.message : String(error)}`,
          effect: "",
        },
      ];
    }
  }

  private getAnalysisTypeKorean(type: string): string {
    const typeMap = {
      business: "비즈니스 활용방안",
      research: "연구 활용방안",
      policy: "정책 활용방안",
      social_problem: "사회문제 해결방안",
    };
    return typeMap[type as keyof typeof typeMap] || `${type} 분석`;
  }

  private formatResults(results: any) {
    return {
      businessApplications: results.business || [],
      researchApplications: results.research || [],
      policyApplications: results.policy || [],
      socialProblemApplications: results.social_problem || [], // ✅ 수정된 카테고리
    };
  }

  private getDefaultRecommendations() {
    const defaultIdea = { 
      description: "기본 추천 내용입니다.", 
      effect: "추천 생성 실패"
    };
    return {
      businessApplications: [
        { title: "데이터 기반 비즈니스 모델 개발", ...defaultIdea },
        { title: "관련 분야 컨설팅 서비스 제공", ...defaultIdea },
      ],
      researchApplications: [
        { title: "현황 분석 및 트렌드 연구", ...defaultIdea },
        { title: "정책 효과성 분석 연구", ...defaultIdea },
      ],
      policyApplications: [
        { title: "정책 수립 시 근거 자료로 활용", ...defaultIdea },
        { title: "예산 배정 및 우선순위 결정", ...defaultIdea },
      ],
      socialProblemApplications: [ // ✅ 수정된 카테고리
        { title: "사회 안전망 강화", ...defaultIdea },
        { title: "시민 편의 증진", ...defaultIdea },
      ],
    };
  }
}