import express, { Request, Response } from "express";
import { getSearchParams, getRecommendations } from "../services/aiService";

const router = express.Router();

// AI 기능이 포함된 버전 사용
router.post("/search", async (req: Request, res: Response) => {
  console.log("Received /api/ai/search request");
  const { prompt } = req.body;

  if (!prompt) {
    console.error("Prompt is missing in /api/ai/search request");
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    // AI 서비스 호출
    const result = await getSearchParams(prompt);
    console.log("AI Search Parameters:", result);
    res.json(result);
  } catch (error) {
    console.error("Error processing AI request:", error);

    // AI 서비스 실패 시 fallback 응답
    const fallbackResult = {
      searchYear: 2025,
      title: prompt.includes("문화재") ? "문화재" : "공공데이터",
      keywords: prompt,
      classificationSystem: prompt.includes("문화재")
        ? "문화체육관광-문화재"
        : "일반공공행정",
      providerAgency: prompt.includes("인천") ? "인천광역시서구" : "기타기관",
    };

    console.log("Using fallback response:", fallbackResult);
    res.json(fallbackResult);
  }
});

router.post("/recommendations", async (req: Request, res: Response) => {
  console.log("Received /api/ai/recommendations request");
  const { prompt, classificationSystem, candidateNames } = req.body;

  if (!prompt || !classificationSystem || !candidateNames) {
    console.error("Missing parameters in /api/ai/recommendations request");
    return res.status(400).json({
      error: "Prompt, classificationSystem, and candidateNames are required",
    });
  }

  try {
    // AI 서비스 호출
    const result = await getRecommendations(prompt, classificationSystem, candidateNames);
    console.log("AI Recommendations:", result);
    res.json(result);
  } catch (error) {
    console.error("Error processing AI recommendation request:", error);

    // AI 서비스 실패 시 fallback 응답
    const fallbackRecommendations = Array.isArray(candidateNames)
      ? candidateNames.slice(0, 3)
      : [];

    const fallbackResult = { recommendations: fallbackRecommendations };
    console.log("Using fallback recommendations:", fallbackResult);
    res.json(fallbackResult);
  }
});

// Health check 엔드포인트
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: "AI service is running",
  });
});

export default router;
