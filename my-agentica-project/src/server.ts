import express, { Request, Response, NextFunction } from "express";
import { PublicDataService } from "./services/PublicDataService";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const publicDataService = new PublicDataService();

app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
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

// ⭐ 에러 타입 가드 함수 추가
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// 기존 쿼리 플랜 엔드포인트
app.post("/api/ai/query-plan", async (req: Request, res: Response) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required",
      code: "MISSING_PROMPT",
    });
  }

  try {
    const result = await publicDataService.createQueryPlan({ prompt });
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error creating query plan:", error);
    res.status(500).json({
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      message: getErrorMessage(error), // ⭐ 타입 안전한 에러 메시지
    });
  }
});

// ⭐ 새로 추가: 데이터 활용 추천 엔드포인트
// app.post("/api/ai/data/utilization", async (req: Request, res: Response) => {
//   const { dataInfo } = req.body;

//   if (!dataInfo) {
//     return res.status(400).json({
//       error: "dataInfo is required",
//       code: "MISSING_DATA_INFO",
//     });
//   }

//   try {
//     console.log("📊 데이터 활용 추천 요청:", dataInfo.fileName);

//     const result = await publicDataService.generateUtilizationRecommendations(
//       dataInfo
//     );

//     res.json({
//       success: true,
//       data: result,
//     });
//   } catch (error) {
//     console.error("데이터 활용 추천 생성 오류:", error);
//     res.status(500).json({
//       error: "Failed to generate utilization recommendations",
//       code: "UTILIZATION_ERROR",
//       message: getErrorMessage(error), // ⭐ 타입 안전한 에러 메시지
//     });
//   }
// });

// ⭐ 새로 추가: 단일 데이터 활용 추천 엔드포인트
app.post(
  "/api/ai/data/utilization/single",
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
        `📊 단일 데이터 활용 추천 요청: ${dataInfo.fileName} (${analysisType})`
      );

      const result =
        await publicDataService.generateSingleUtilizationRecommendation({
          dataInfo,
          analysisType,
        });

      // ✅ 수정: 직접 배열로 응답
      res.json(result);
    } catch (error) {
      console.error("단일 데이터 활용 추천 생성 오류:", error);

      // 오류 시에도 배열 형태로 응답
      res.status(500).json(["오류가 발생했습니다: " + getErrorMessage(error)]);
    }
  }
);

// ⭐ 헬스 체크 엔드포인트 (선택사항)
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Agentica AI Service",
  });
});

app.listen(port, () => {
  console.log(`🚀 Agentica AI Service running on http://localhost:${port}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /api/ai/query-plan - 쿼리 플랜 생성`);
  console.log(`   POST /api/ai/data/utilization - 데이터 활용 추천`);
  console.log(
    `   POST /api/ai/data/utilization/single - 단일 데이터 활용 추천`
  );
  console.log(`   GET  /health - 헬스 체크`);
});

export default app;
