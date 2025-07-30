import express, { Request, Response, NextFunction } from "express";
import { PublicDataService } from "./services/PublicDataService";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const publicDataService = new PublicDataService();

// 미들웨어 설정
app.use(express.json());

// CORS 설정
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*"); // 모든 출처 허용
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 에러 처리 유틸리티
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// ================================
// 🎯 AI 서비스 엔드포인트
// ================================

// 전체 활용방안 (대시보드용)
app.post("/api/data-utilization/full", async (req: Request, res: Response) => {
  const { dataInfo } = req.body;
  if (!dataInfo) {
    return res.status(400).json({
      error: "dataInfo is required",
      code: "MISSING_DATA_INFO",
    });
  }
  try {
    console.log("📊 전체 활용방안 요청:", dataInfo.fileName);
    const result = await publicDataService.generateUtilizationRecommendations(
      dataInfo
    );
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("전체 활용방안 생성 오류:", error);
    res.status(500).json({
      error: "Failed to generate full utilization recommendations",
      code: "UTILIZATION_ERROR",
      message: getErrorMessage(error),
    });
  }
});

// 단일 활용방안 (특정 카테고리)
app.post(
  "/api/data-utilization/single",
  async (req: Request, res: Response) => {
    const { dataInfo, analysisType } = req.body;
    if (!dataInfo || !analysisType) {
      return res.status(400).json({
        error: "dataInfo and analysisType are required",
        code: "MISSING_PARAMETERS",
      });
    }
    try {
      console.log(
        `📊 단일 활용방안 요청: ${dataInfo.fileName} (${analysisType})`
      );
      const result =
        await publicDataService.generateSingleUtilizationRecommendation({
          dataInfo,
          analysisType,
        });
      res.json(result); // 배열 직접 반환
    } catch (error) {
      console.error("단일 활용방안 생성 오류:", error);
      res.status(500).json(["오류가 발생했습니다: " + getErrorMessage(error)]);
    }
  }
);

// ================================
// 🩺 헬스 체크
// ================================

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Agentica AI Service",
  });
});

// 서버 시작
app.listen(port, () => {
  console.log(`🚀 Agentica AI Service running on http://localhost:${port}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /api/data-utilization/full - 전체 활용방안`);
  console.log(`   POST /api/data-utilization/single - 단일 활용방안`);
  console.log(`   GET  /health - 헬스 체크`);
});

export default app;
