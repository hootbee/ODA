import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// 새로운 데이터 구조에 대한 인터페이스 정의
interface UtilizationIdea {
  title: string;
  description: string;
  effect: string;
}

export class DataUtilizationService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
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
                      "social_problem",
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

  // 전체 활용 프롬프트 생성 함수
  private buildFullAnalysisPrompt(dataInfo: any): Record<string, string> {
    const basePrompt = `데이터 정보: ${JSON.stringify(dataInfo)}
각 분석 유형에서 데이터 활용 아이디어 2개씩 JSON 배열로 제시하세요.
반드시 아래 포맷을 따르세요:
[
  {
    "title": "아이디어 제목",
    "description": "간략 설명",
    "effect": "기대 효과"
  }
]`;

    return {
      business: `비즈니스 관점에서 ${basePrompt}`,
      research: `연구 관점에서 ${basePrompt}`,
      policy: `정책 관점에서 ${basePrompt}`,
      social_problem: `사회문제 해결 관점에서 ${basePrompt}`,
    };
  }

  // 단일 활용 프롬프트 생성 함수 (content 필드 사용)
  private buildSingleAnalysisPrompt(dataInfo: any, promptHint: string): string {
    return `
데이터 정보: ${JSON.stringify(dataInfo)}
사용자 요청: ${promptHint}
위 요청에 맞는 데이터 활용 방안 1~2개를 아래 JSON 구조로 제시하세요:
[
  {
    "title": "아이디어 제목",
    "content": "상세 설명"
  }
]
응답은 반드시 위 JSON 배열 형식으로 반환하세요.
`;
  }

  // 미리 정의된 타입용 단일 프롬프트 (description 필드 사용)
  private buildPredefinedSinglePrompt(dataInfo: any, analysisType: string): string {
    const typeMap = {
      business: "비즈니스",
      research: "연구",
      policy: "정책",
      social_problem: "사회문제 해결"
    };

    const typeName = typeMap[analysisType as keyof typeof typeMap] || analysisType;

    return `데이터 정보: ${JSON.stringify(dataInfo)}
${typeName} 관점에서 데이터 활용 아이디어 2개를 JSON 배열로 제시하세요.
반드시 아래 포맷을 따르세요:
[
  {
    "title": "아이디어 제목", 
    "description": "간략 설명",
    "effect": "기대 효과"
  }
]`;
  }

  // 전체 활용 실행
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
    socialProblemApplications: UtilizationIdea[];
  }> {
    console.log(`🔍 전체 활용 추천 생성: ${dataInfo.fileName}`);
    try {
      const prompts = this.buildFullAnalysisPrompt(dataInfo);
      const results: any = {};
      for (const [type, prompt] of Object.entries(prompts)) {
        const result = await this.callGenerativeAI(prompt);
        results[type] = this.parseSpecificAnalysis(result, type);
      }
      return this.formatResults(results);
    } catch (error) {
      console.error("전체 활용 분석 중 오류:", error);
      return this.getDefaultRecommendations();
    }
  }

  // 단일 활용 실행
  public async generateSingleRecommendation(dataInfo: any, analysisTypeOrPrompt: string): Promise<any> {
    const predefinedTypes = [
      "business",
      "research",
      "policy",
      "social_problem",
    ];

    console.log(`🔍 단일 활용 추천 생성: ${analysisTypeOrPrompt}`);

    try {
      if (predefinedTypes.includes(analysisTypeOrPrompt)) {
        // 미리 정의된 타입: description 필드 사용
        const prompt = this.buildPredefinedSinglePrompt(dataInfo, analysisTypeOrPrompt);
        console.log(`🔍 ${analysisTypeOrPrompt} 프롬프트:`, prompt.substring(0, 200) + "...");

        const result = await this.callGenerativeAI(prompt);
        console.log(`🔍 ${analysisTypeOrPrompt} AI 응답:`, result.substring(0, 300) + "...");

        const recommendations = this.parseSpecificAnalysis(result, analysisTypeOrPrompt);
        console.log(`✅ ${analysisTypeOrPrompt} 파싱 결과:`, recommendations);

        return {
          type: analysisTypeOrPrompt,
          recommendations: recommendations
        };
      } else {
        // 맞춤 프롬프트: content 필드 사용
        const prompt = this.buildSingleAnalysisPrompt(dataInfo, analysisTypeOrPrompt);
        const result = await this.callGenerativeAI(prompt);
        const recommendations = this.parseSimpleRecommendation(result);

        console.log(`✅ 맞춤 추천 결과:`, recommendations);

        return {
          type: "simple_recommendation",
          recommendations: recommendations
        };
      }
    } catch (error) {
      console.error("단일 활용 분석 중 오류:", error);
      return {
        type: "error",
        recommendations: [{ title: "오류 발생", content: String(error) }]
      };
    }
  }

  // AI 호출
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

  // ✅ 수정된 JSON 파싱 로직
  private cleanJsonResponse(response: string): string {
    // 1. 마크다운 코드블록 제거
    let cleaned = response.replace(/``````\s*/g, '');

    // 2. 앞뒤 공백 제거
    cleaned = cleaned.trim();

    // 3. 특수 문자나 불필요한 텍스트 제거
    const jsonStart = cleaned.indexOf('[');
    const jsonEnd = cleaned.lastIndexOf(']');

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    }

    console.log("🔧 정제된 JSON:", cleaned);
    return cleaned;
  }

  // 전체 분석 응답 파싱 (description 필드)
  private parseSpecificAnalysis(response: string, type: string): UtilizationIdea[] {
    console.log(`🔧 ${type} 원본 응답:`, response);

    try {
      const cleaned = this.cleanJsonResponse(response);
      let parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) {
        console.warn(`⚠️ ${type} 응답이 배열이 아님:`, typeof parsed, parsed);
        return [{ title: "형식 오류", description: "AI 응답이 배열 형식이 아닙니다.", effect: "" }];
      }

      const results = parsed.filter(
          (item: any) => {
            const hasRequiredFields = item && item.title && item.description && item.effect;
            if (!hasRequiredFields) {
              console.warn(`⚠️ 필수 필드 누락:`, item);
            }
            return hasRequiredFields;
          }
      );

      console.log(`✅ ${type} 파싱 완료:`, results);

      if (results.length === 0) {
        return [
          { title: `${this.getAnalysisTypeKorean(type)} 1`, description: "생성된 추천 내용이 없습니다.", effect: "" },
          { title: `${this.getAnalysisTypeKorean(type)} 2`, description: "생성된 추천 내용이 없습니다.", effect: "" },
        ];
      }
      return results;
    } catch (error) {
      console.error(`❌ ${type} 파싱 오류:`, error);
      console.error(`❌ 파싱 실패한 응답:`, response);
      return [
        {
          title: `${this.getAnalysisTypeKorean(type)} 분석 중 오류 발생`,
          description: `오류 내용: ${error instanceof Error ? error.message : String(error)}`,
          effect: "",
        },
      ];
    }
  }

  // 단일 분석 응답 파싱 (content 필드)
  private parseSimpleRecommendation(response: string): any[] {
    console.log("🔧 맞춤 추천 원본 응답:", response);

    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) {
        console.warn("⚠️ 맞춤 추천 응답이 배열이 아님:", typeof parsed);
        return [{ title: "형식 오류", content: "AI 응답이 배열 형식이 아닙니다." }];
      }

      const results = parsed.filter((item: any) => item && item.title && item.content);
      console.log("✅ 맞춤 추천 파싱 완료:", results);

      return results;
    } catch (error) {
      console.error("❌ 맞춤 추천 파싱 오류:", error);
      return [{ title: "추천 오류", content: String(error) }];
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
      socialProblemApplications: results.social_problem || [],
    };
  }

  // 기본 응답 결과
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
      socialProblemApplications: [
        { title: "사회 안전망 강화", ...defaultIdea },
        { title: "시민 편의 증진", ...defaultIdea },
      ],
    };
  }
}
