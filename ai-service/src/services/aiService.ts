import { Agentica } from "@agentica/core";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";
import {
  SearchParamsSchema,
  RecommendationParamsSchema,
} from "../schemas/aiSchemas";

// 파일 상단에 추가
if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY environment variable is not set");
  throw new Error("GEMINI_API_KEY is required");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ai = new Agentica({
  model: "gemini-agent",
  vendor: {
    api: genAI,
    model: "gemini-1.5-flash", // ✅ 실제 지원되는 모델명으로 변경
  },
  controllers: [],
});

export const getSearchParams = async (prompt: string) => {
  try {
    const result = await ai.structured(
      // ✅ generate → structured로 변경
      `
        You are a search assistant for public data.
        Analyze the following user prompt and extract search parameters based on the provided schema.
        The user is looking for data in a database with the following fields: title, keywords, description, providerAgency, classificationSystem.
        Identify the year the user is interested in, and extract relevant search terms for the other fields.

        User Prompt: "${prompt}"
      `,
      {
        schema: SearchParamsSchema, // ✅ 객체로 감싸기
      }
    );
    return result; // ✅ result.output → result로 변경
  } catch (error) {
    console.error("Error in getSearchParams:", error);
    throw error;
  }
};

export const getRecommendations = async (
  prompt: string,
  classificationSystem: string,
  candidateNames: string[]
) => {
  try {
    const result = await ai.structured(
      // ✅ generate → structured로 변경
      `
        You are a recommendation assistant for public data.
        Based on the user's prompt, the identified classificationSystem, and a list of candidate data names,
        generate a list of recommended data names.

        User Prompt: "${prompt}"
        ClassificationSystem: "${classificationSystem}"
        Candidate Data Names: ${JSON.stringify(candidateNames)}
      `,
      {
        schema: RecommendationParamsSchema, // ✅ 객체로 감싸기
      }
    );
    return result; // ✅ result.output → result로 변경
  } catch (error) {
    console.error("Error in getRecommendations:", error);
    throw error;
  }
};
