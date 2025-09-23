// src/server.ts
import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import * as path from "path";
import { PublicDataService } from "./services/PublicDataService";
import { geminiClient, DEFAULT_GEMINI_MODEL } from "./lib/aiClient";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// ✅ PublicDataService가 다운로드/분석까지 관리
const publicDataService = new PublicDataService({
  llm: geminiClient,
  model: DEFAULT_GEMINI_MODEL,
  downloadsDir: path.resolve(__dirname, "../downloads"),
});

// -------------------------------
// 미들웨어
// -------------------------------
app.use(express.json());

// CORS (간단 오픈 정책)
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

// 에러 메시지 유틸
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// -------------------------------
// 🎯 엔드포인트
// -------------------------------

// ✅ 통합 분석(다운로드→분석→정리)
app.post("/api/analyze-data-by-pk", async (req: Request, res: Response) => {
  const { publicDataPk, prompt } = req.body;
  if (!publicDataPk) {
    return res.status(400).json({
      error: "publicDataPk is required",
      code: "MISSING_PUBLIC_DATA_PK",
    });
  }

  try {
    const result = await publicDataService.analyzeDataByPk({
      publicDataPk,
      prompt,
    });
    res.json(result);
  } catch (error) {
    console.error("[Workflow] Error:", error);
    res.status(500).json({
      error: "Failed to complete the analysis workflow",
      code: "WORKFLOW_ERROR",
      message: getErrorMessage(error),
    });
  }
});

// ✅ 파일 다운로드(스트리밍)
app.get(
    "/api/download-by-pk/:publicDataPk",
    async (req: Request, res: Response) => {
      const { publicDataPk } = req.params;
      if (!publicDataPk) {
        return res.status(400).json({ error: "publicDataPk is required" });
      }

      try {
        const { buffer, fileName, contentType } =
            await publicDataService.downloadFileBuffer(publicDataPk);

        // 캐시 비활성화
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        // 파일명/콘텐츠 타입
        res.setHeader(
            "Content-Disposition",
            `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
        );
        res.setHeader("Content-Type", contentType);

        res.send(buffer);
      } catch (error) {
        console.error(`[Download] Error for PK ${publicDataPk}:`, error);
        res.status(500).json({
          error: "Failed to download the file",
          message: getErrorMessage(error),
        });
      }
    }
);

// ✅ 전체 활용방안 → 프론트 파서가 인식하는 { success:true, data:{...} }로 래핑
app.post("/api/data-utilization/full", async (req: Request, res: Response) => {
  const { dataInfo, prompt } = req.body;

  // dataInfo가 없으면 낱개 필드로부터 구성
  const normalized =
      dataInfo ?? {
        title: req.body.title,
        description: req.body.description,
        keywords: req.body.keywords,
        category: req.body.category,
      };

  if (
      !normalized?.title ||
      !normalized?.description ||
      !normalized?.keywords ||
      !normalized?.category
  ) {
    return res.status(400).json({
      error: "dataInfo or {title, description, keywords, category} is required",
      code: "MISSING_DATA_INFO",
    });
  }

  try {
    console.log("📊 전체 활용방안 요청:", normalized.title);
    const dto = await publicDataService.generateAllUtilizationRecommendations({
      dataInfo: normalized,
      title: normalized.title,
      description: normalized.description,
      keywords: normalized.keywords,
      category: normalized.category,
      prompt: prompt ?? "전체 활용방안",
    });

    // 👇 프론트의 normalizeUtilizationPayload가 인식
    res.json({ success: true, data: dto });
  } catch (error) {
    console.error("전체 활용방안 생성 오류:", error);
    res.status(500).json({
      error: "Failed to generate full utilization recommendations",
      code: "UTILIZATION_ERROR",
      message: getErrorMessage(error),
    });
  }
});

// ✅ 단일 활용방안 → 항상 { type, recommendations } 스키마
app.post(
    "/api/data-utilization/single",
    async (req: Request, res: Response) => {
      const { dataInfo, analysisType } = req.body;
      const info =
          dataInfo ?? {
            title: req.body.title,
            description: req.body.description,
            keywords: req.body.keywords,
            category: req.body.category,
          };

      if (
          !info?.title ||
          !info?.description ||
          !info?.keywords ||
          !info?.category ||
          !analysisType
      ) {
        return res.status(400).json({
          type: "error",
          recommendations: [
            {
              title: "요청 오류",
              content:
                  "dataInfo(또는 title/description/keywords/category)와 analysisType이 필요합니다.",
            },
          ],
        });
      }

      try {
        console.log(`📊 단일 활용방안 요청: ${info.title} (${analysisType})`);
        const dto =
            await publicDataService.generateSingleUtilizationRecommendation({
              dataInfo: info,
              analysisType,
            });

        return res.json({
          type: dto.type || "simple_recommendation",
          recommendations: dto.recommendations,
        });
      } catch (error) {
        console.error("단일 활용방안 생성 오류:", error);
        res.status(500).json({
          type: "error",
          recommendations: [
            { title: "예외 발생", content: getErrorMessage(error) },
          ],
        });
      }
    }
);

// ✅ 헬스 체크
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Agentica AI Service",
  });
});

// -------------------------------
// 서버 시작
// -------------------------------
app.listen(port, () => {
  console.log(`🚀 Agentica AI Service running on http://localhost:${port}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /api/analyze-data-by-pk               - 파일 PK 분석 워크플로`);
  console.log(
      `   GET  /api/download-by-pk/:publicDataPk     - 파일 다운로드 스트리밍`
  );
  console.log(`   POST /api/data-utilization/full            - 전체 활용방안`);
  console.log(`   POST /api/data-utilization/single          - 단일 활용방안`);
  console.log(`   GET  /health                               - 헬스 체크`);
});

export default app;