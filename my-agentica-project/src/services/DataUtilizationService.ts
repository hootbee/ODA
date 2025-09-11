// services/DataUtilizationService.ts
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// 새로운 데이터 구조에 대한 인터페이스 정의
interface UtilizationIdea {
  title: string;
  description: string;
  metrics: {
    effect: string;
    budget: string;
    difficulty: string;
  };
}

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
    businessApplications: UtilizationIdea[];
    researchApplications: UtilizationIdea[];
    policyApplications: UtilizationIdea[];
    combinationSuggestions: UtilizationIdea[];
    analysisTools: UtilizationIdea[];
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
  ): Promise<any> { // ✅ 반환 타입 수정
    const predefinedTypes = [
      "business",
      "research",
      "policy",
      "combination",
      "tools",
    ];

    // 입력이 미리 정의된 카테고리 중 하나인지 확인
    if (predefinedTypes.includes(analysisTypeOrPrompt)) {
      // 기존 로직: 카테고리 기반 분석 (전체 활용방안 기능에 필요)
      console.log(
        `[DataUtilizationService] 카테고리 기반 단일 활용 추천 생성: ${dataInfo.fileName} (${analysisTypeOrPrompt})`
      );
      // 이 부분은 현재 요약 대시보드에서만 사용되므로, 필요 시 별도 수정
      return this.executeSingleAgenticAnalysis(
        dataInfo,
        analysisTypeOrPrompt
      );
    } else {
      // 새로운 로직: 사용자 프롬프트 기반의 유연한 분석 (상세보기에 해당)
      console.log(
        `[DataUtilizationService] 유연한 단일 활용 추천 생성: ${dataInfo.fileName}`
      );
      const detailedPrompt = this.buildFlexibleDetailedPrompt(
        dataInfo,
        analysisTypeOrPrompt
      );
      const result = await this.callGenerativeAI(detailedPrompt);
      const recommendations = this.parseSpecificAnalysis(result, "사용자 맞춤 활용 방안");
      
      // 프론트엔드가 받을 수 있도록 `simple_recommendation` 타입으로 래핑
      return { type: "simple_recommendation", recommendations };
    }
  }

  /**
   * Agentica 스타일의 단일 분석 실행
   */
  private async executeSingleAgenticAnalysis(
    dataInfo: any,
    analysisType: string
  ): Promise<UtilizationIdea[]> {
    const prompt = `
데이터 정보:
${JSON.stringify(dataInfo)}

${analysisType} 관점에서 analyze_data_utilization 함수를 호출하여 분석해주세요.
집중 분야: ${this.getFocusArea(analysisType, dataInfo.category)}
    `;

    const result = await this.model.generateContent(prompt);
    const response = result.response;

    if (response.usageMetadata) {
      const { promptTokenCount, candidatesTokenCount, totalTokenCount } =
        response.usageMetadata;
      console.log(
        `[Gemini 토큰 사용량] Agentic 분석 (${analysisType}) | 입력: ${promptTokenCount} 토큰 | 출력: ${candidatesTokenCount} 토큰 | 총합: ${totalTokenCount} 토큰`
      );
    }

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
    const basePrompt = `다음 공공데이터의 활용방안 2가지를 JSON 배열 형식으로 제시해주세요.
각 항목은 다음 JSON 구조를 반드시 따라야 합니다:
{
  "title": "활용 아이디어 제목",
  "description": "아이디어에 대한 1-2 문장의 간결한 설명",
  "metrics": {
    "effect": "예상 효과(예: 15% 이용률 향상)",
    "budget": "필요 예산(예: 약 2억 원)",
    "difficulty": "난이도 (상, 중, 하 중 하나)"
  }
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
    "metrics": {
      "effect": "효과...",
      "budget": "예산...",
      "difficulty": "중"
    }
  },
  {
    "title": "아이디어 2",
    "description": "설명...",
    "metrics": {
      "effect": "효과...",
      "budget": "예산...",
      "difficulty": "하"
    }
  }
]`;

    const typePrompts = {
      business: `비즈니스 관점에서의 ${basePrompt}${formatInstruction}`,
      research: `연구 관점에서의 ${basePrompt}${formatInstruction}`,
      policy: `정책 관점에서의 ${basePrompt}${formatInstruction}`,
      combination: `데이터 결합 관점에서의 ${basePrompt}${formatInstruction}`,
      tools: `분석 도구 추천 관점에서의 ${basePrompt}${formatInstruction}`,
    };

    return typePrompts[analysisType as keyof typeof typePrompts] || "";
  }

  /**
   * ✅ 새로 추가된 유연한 프롬프트 빌더
   */
  private buildFlexibleDetailedPrompt(
    dataInfo: any,
    userPrompt: string
  ): string {
    const prompt = `
당신은 데이터 분석 및 활용 전략 전문가입니다. 주어진 공공데이터 정보와 사용자의 구체적인 요청을 바탕으로, 실행 가능하고 창의적인 데이터 활용 방안을 제안해주세요.

### 공공데이터 정보:
- **데이터명**: ${dataInfo.title || dataInfo.fileName}
- **제공 기관**: ${dataInfo.providerAgency || "정보 없음"}
- **데이터 분류**: ${dataInfo.category || "정보 없음"}
- **키워드**: ${dataInfo.keywords || "정보 없음"}
- **상세 설명**: ${dataInfo.description || "정보 없음"}

### 사용자의 구체적인 요청:
"${userPrompt}"

### 지시사항:
1.  사용자의 요청을 깊이 이해하고, 요청의 핵심 의도에 정확히 부합하는 답변을 생성하세요.
2.  제안하는 아이디어는 구체적이고, 현실적으로 실행 가능해야 합니다.
3.  결과는 아래에 명시된 JSON 구조를 따르는 객체들의 배열 형식으로 반환해주세요.
4.  각 아이디어는 'title', 'description', 'metrics' 필드를 포함해야 합니다.
    - **title**: 활용 아이디어의 핵심 제목
    - **description**: 아이디어에 대한 상세한 설명 (2-3문장)
    - **metrics**: 실행 가능성 지표 (예상효과, 필요예산, 난이도)

### 응답 형식 (JSON):
[
  {
    "title": "사용자 맞춤형 아이디어 1",
    "description": "아이디어에 대한 구체적이고 상세한 설명입니다...",
    "metrics": {
      "effect": "상세한 예상 효과 (예: 특정 지표 20% 개선)",
      "budget": "구체적인 예산 (예: 약 5천만 원 ~ 1억 원)",
      "difficulty": "상세 난이도 (예: 상 - 전문 인력 및 장기 계획 필요)"
    }
  }
]
`;
    console.log(
      "[DataUtilizationService] 생성된 유연한 상세 프롬프트:",
      prompt
    );
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
    const response = result.response;

    if (response.usageMetadata) {
      const { promptTokenCount, candidatesTokenCount, totalTokenCount } =
        response.usageMetadata;
      console.log(
        `[Gemini 토큰 사용량] 상세 활용방안 생성 | 입력: ${promptTokenCount} 토큰 | 출력: ${candidatesTokenCount} 토큰 | 총합: ${totalTokenCount} 토큰`
      );
    }

    return response.text();
  }

  /**
   * ✅ 방법 2: 유연하고 강력한 응답 파싱 로직
   */
  private parseSpecificAnalysis(
    response: string,
    type: string
  ): any[] { // 반환 타입을 any[]로 변경하여 유연성 확보
    try {
      console.log(`🔍 Raw response for ${type}:`, response);

      const cleaned = response.replace(/```json|```/g, "").trim();
      let parsed;

      try {
        parsed = JSON.parse(cleaned);
      } catch (jsonError) {
        console.error(`❌ JSON parsing error for ${type}:`, jsonError);
        const arrayMatch = cleaned.match(/[\[\s\S]*?\]/);
        if (arrayMatch && arrayMatch[0]) {
          try {
            parsed = JSON.parse(arrayMatch[0]);
          } catch (innerJsonError) {
            console.error(`❌ Inner JSON parsing error for ${type}:`, innerJsonError);
            return [{ title: "파싱 오류", description: "분석 중 파싱 오류가 발생했습니다.", metrics: {} }];
          }
        } else {
          return [{ title: "형식 오류", description: `${type} 분석 중 JSON 형식을 찾을 수 없습니다.`, metrics: {} }];
        }
      }

      console.log(`✅ Parsed result for ${type}:`, parsed);

      if (!Array.isArray(parsed)) {
        return [{ title: "형식 오류", description: "AI 응답이 배열 형식이 아닙니다.", metrics: {} }];
      }

      // 새로운 데이터 구조에 대한 유효성 검사
      const results = parsed.filter(
        (item: any) => item && item.title && item.description && item.metrics
      );

      if (results.length === 0) {
        return [
          { title: `${this.getAnalysisTypeKorean(type)} 1`, description: "생성된 추천 내용이 없습니다.", metrics: {} },
          { title: `${this.getAnalysisTypeKorean(type)} 2`, description: "생성된 추천 내용이 없습니다.", metrics: {} },
        ];
      }

      console.log(`🎯 Final ${type} result:`, results);
      return results;
    } catch (error) {
      console.error(`💥 Error parsing ${type} analysis:`, error);
      return [
        {
          title: `${this.getAnalysisTypeKorean(type)} 분석 중 오류 발생`,
          description: `오류 내용: ${ 
            error instanceof Error ? error.message : String(error) 
          }`,
          metrics: {},
        },
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
    const defaultMetrics = {
      effect: "추천 생성 실패",
      budget: "- ",
      difficulty: "- ",
    };
    return {
      businessApplications: [
        { title: "데이터 기반 비즈니스 모델 개발", description: "기본 추천 내용입니다.", metrics: defaultMetrics },
        { title: "관련 분야 컨설팅 서비스 제공", description: "기본 추천 내용입니다.", metrics: defaultMetrics },
      ],
      researchApplications: [
        { title: "현황 분석 및 트렌드 연구", description: "기본 추천 내용입니다.", metrics: defaultMetrics },
        { title: "정책 효과성 분석 연구", description: "기본 추천 내용입니다.", metrics: defaultMetrics },
      ],
      policyApplications: [
        { title: "정책 수립 시 근거 자료로 활용", description: "기본 추천 내용입니다.", metrics: defaultMetrics },
        { title: "예산 배정 및 우선순위 결정", description: "기본 추천 내용입니다.", metrics: defaultMetrics },
      ],
      combinationSuggestions: [
        { title: "인구 통계 데이터와 결합 분석", description: "기본 추천 내용입니다.", metrics: defaultMetrics },
        { title: "경제 지표와 상관관계 분석", description: "기본 추천 내용입니다.", metrics: defaultMetrics },
      ],
      analysisTools: [
        { title: "Python (pandas, matplotlib)", description: "기본 추천 내용입니다.", metrics: defaultMetrics },
        { title: "R 통계 분석 및 시각화", description: "기본 추천 내용입니다.", metrics: defaultMetrics },
      ],
    };
  }
}
