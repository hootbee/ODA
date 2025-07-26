import { z } from "zod";

export const SearchParamsSchema = z.object({
  searchYear: z.number().optional().describe("검색할 연도 (예: 2025)"),
  title: z.string().optional().describe("검색할 제목"),
  keywords: z.string().optional().describe("검색할 키워드 (쉼표로 구분)"),
  description: z.string().optional().describe("검색할 설명"),
  providerAgency: z.string().optional().describe("데이터 제공 기관"),
  classificationSystem: z.string().optional().describe("분류 체계"),
});

export const RecommendationParamsSchema = z.object({
  recommendations: z
    .array(z.string())
    .describe("사용자 프롬프트와 가장 관련성이 높은 추천 데이터 이름 목록 (3개에서 5개 사이)"),
});
