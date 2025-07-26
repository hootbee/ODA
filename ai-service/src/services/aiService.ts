import { Agentica } from "@agentica/core";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

// 환경변수 검증
if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY environment variable is not set");
  throw new Error("GEMINI_API_KEY is required");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Agentica 올바른 초기화
const ai = new Agentica({
  model: "gemini-1.5-flash", // 문자열로 모델명 지정
  vendor: {
    openai: genAI, // api 대신 openai 속성 사용
  },
  controllers: [], // 빈 배열로 시작
});

export const getSearchParams = async (prompt: string) => {
  try {
    // 올바른 메서드 사용법 확인 필요
    const response = await ai.ask(`
      당신은 한국 공공데이터 검색 어시스턴트입니다.
      사용자 질의를 분석하여 검색 파라미터를 추출하세요.
      
      사용자 질의: "${prompt}"
      
      다음 JSON 형식으로만 응답하세요:
      {
        "searchYear": 연도(숫자) 또는 null,
        "title": "주제",
        "keywords": "키워드", 
        "classificationSystem": "분류체계",
        "providerAgency": "제공기관"
      }
    `);

    console.log("Agentica 응답:", response);

    // JSON 파싱
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Agentica 에러:", error);
    throw error;
  }
};

export const getRecommendations = async (
  prompt: string,
  category: string,
  candidateNames: string[]
) => {
  try {
    const response = await ai.ask(`
      당신은 공공데이터 추천 어시스턴트입니다.
      
      사용자 관심사: "${prompt}"
      카테고리: "${category}"
      후보 데이터: ${candidateNames.join(", ")}
      
      위 후보 중에서 사용자 관심사와 가장 관련성 높은 3개를 선택하세요.
      
      다음 JSON 형식으로만 응답하세요:
      {
        "recommendations": ["선택된항목1", "선택된항목2", "선택된항목3"]
      }
    `);

    console.log("Agentica 추천 응답:", response);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in recommendations response");
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Agentica 추천 에러:", error);
    throw error;
  }
};
