/** 단일/심플 모드용 아이디어 DTO */
export type SimpleUtilizationIdea = {
  title: string;
  content: string;
};

/** 전체 활용 모드용 아이디어 DTO */
export type RichUtilizationIdea = {
  title: string;
  content: string;
  description: string;
  effect: string;
};

export type SingleLikeDTO = {
  type: "simple_recommendation" | "error";
  recommendations: SimpleUtilizationIdea[]; // SimpleUtilizationIdea 사용
  meta?: { mode: "single" | "simple" };
};

export type AllRecommendationsDTO = {
  businessApplications: RichUtilizationIdea[]; // RichUtilizationIdea 사용
  researchApplications: RichUtilizationIdea[];
  policyApplications: RichUtilizationIdea[];
  socialProblemApplications: RichUtilizationIdea[];
};

export type DataInfo = {
  title: string;
  description: string;
  keywords: string;
  category: string;
};

/* --------------------------- 스키마 분리 --------------------------- */

/** Simple 모드용 스키마: { title, content } */
export const simpleIdeaSchema = {
  type: "object",
  properties: { title: { type: "string" }, content: { type: "string" } },
  required: ["title", "content"],
};

/** Rich 모드(전체 활용)용 스키마: { title, content, description, effect } */
export const richIdeaSchema = {
  type: "object",
  properties: { 
    title: { type: "string" }, 
    content: { type: "string" },
    description: { type: "string" },
    effect: { type: "string" },
  },
  required: ["title", "content", "description", "effect"],
};

export const bucketsSchema = {
  type: "object",
  properties: {
    businessApplications: { type: "array", items: richIdeaSchema }, // Rich 스키마 사용
    researchApplications: { type: "array", items: richIdeaSchema },
    policyApplications: { type: "array", items: richIdeaSchema },
    socialProblemApplications: { type: "array", items: richIdeaSchema },
  },
  required: [
    "businessApplications",
    "researchApplications",
    "policyApplications",
    "socialProblemApplications",
  ],
};
