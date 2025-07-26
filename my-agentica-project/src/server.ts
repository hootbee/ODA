import express, { Request, Response } from "express";
import { PublicDataService } from "./services/PublicDataService";

const app = express();
const port = process.env.PORT || 3001;

// PublicDataService 인스턴스 생성
const publicDataService = new PublicDataService();

app.use(express.json());

// 헬스체크 엔드포인트
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Agentica AI Service",
  });
});

// 검색 파라미터 추출 엔드포인트 (PublicDataService 직접 호출)
app.post("/api/ai/search", async (req: Request, res: Response) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    console.log("받은 검색 요청:", prompt);

    // ✅ PublicDataService 직접 호출 (타입 안전)
    const result = await publicDataService.searchData({ prompt });

    console.log("직접 호출 결과:", result);
    res.json(result);
  } catch (error) {
    console.error("검색 에러:", error);

    const fallbackResponse = {
      searchYear: prompt.includes("202") ? 2025 : null,
      title: prompt.includes("문화재") ? "문화재" : "공공데이터",
      keywords: prompt,
      classificationSystem: prompt.includes("문화재")
        ? "문화체육관광-문화재"
        : "일반공공행정",
      providerAgency: prompt.includes("인천") ? "인천광역시서구" : "기타기관",
    };

    res.json(fallbackResponse);
  }
});

// 추천 엔드포인트 (PublicDataService 직접 호출)
app.post("/api/ai/recommendations", async (req: Request, res: Response) => {
  const { prompt, classificationSystem, candidateNames } = req.body;

  if (!prompt || !classificationSystem || !candidateNames) {
    return res.status(400).json({
      error: "prompt, classificationSystem, candidateNames are required",
    });
  }

  try {
    console.log("받은 추천 요청:", {
      prompt,
      category: classificationSystem,
      candidateNames,
    });

    // ✅ PublicDataService 직접 호출
    const result = await publicDataService.recommendData({
      prompt,
      category: classificationSystem,
      candidates: candidateNames,
    });

    console.log("직접 호출 추천 결과:", result);
    res.json(result);
  } catch (error) {
    console.error("추천 에러:", error);

    // Fallback 응답
    const fallbackResponse = {
      recommendations: candidateNames.slice(0, 3),
    };

    res.json(fallbackResponse);
  }
});

app.listen(port, () => {
  console.log(`🚀 Agentica AI Service running on port ${port}`);
  console.log(`📡 Health check: http://localhost:${port}/health`);
  console.log(`🔍 Search API: http://localhost:${port}/api/ai/search`);
  console.log(
    `💡 Recommendations API: http://localhost:${port}/api/ai/recommendations`
  );
});
