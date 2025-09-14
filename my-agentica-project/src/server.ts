// src/server.ts
import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import * as fs from "fs/promises";
import * as path from "path";
import { PublicDataService } from "./services/PublicDataService";
import { openaiClient, DEFAULT_GEMINI_MODEL } from "./lib/aiClient";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// ✅ PublicDataService가 다운로드/분석까지 관리
const publicDataService = new PublicDataService({
  llm: openaiClient,
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
  const { publicDataPk } = req.body;
  if (!publicDataPk) {
    return res.status(400).json({
      error: "publicDataPk is required",
      code: "MISSING_PUBLIC_DATA_PK",
    });
  }

  try {
    const result = await publicDataService.analyzeDataByPk(publicDataPk);
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
app.get("/api/download-by-pk/:publicDataPk", async (req: Request, res: Response) => {
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
});

// ✅ 전체 활용방안
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
    const result = await publicDataService.generateUtilizationRecommendations(dataInfo);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("전체 활용방안 생성 오류:", error);
    res.status(500).json({
      error: "Failed to generate full utilization recommendations",
      code: "UTILIZATION_ERROR",
      message: getErrorMessage(error),
    });
  }
});

// ✅ 단일 활용방안
app.post("/api/data-utilization/single", async (req: Request, res: Response) => {
  const { dataInfo, analysisType } = req.body;
  if (!dataInfo || !analysisType) {
    return res.status(400).json({
      type: "error",
      recommendations: [
        { title: "요청 오류", content: "dataInfo와 analysisType이 필요합니다." },
      ],
    });
  }

  try {
    console.log(`📊 단일 활용방안 요청: ${dataInfo.fileName} (${analysisType})`);
    const result = await publicDataService.generateSingleUtilizationRecommendation({
      dataInfo,
      analysisType,
    });

    // ✅ 항상 동일 스키마 유지: { type, recommendations: [] }
    if (Array.isArray(result?.recommendations)) {
      return res.json({
        type: result.type || "simple_recommendation",
        recommendations: result.recommendations,
      });
    }
    return res.json({
      type: "error",
      recommendations: [{ title: "생성 실패", content: "단일 활용 방안을 생성하지 못했습니다." }],
    });
  } catch (error) {
    console.error("단일 활용방안 생성 오류:", error);
    res.status(500).json({
      type: "error",
      recommendations: [{ title: "예외 발생", content: getErrorMessage(error) }],
    });
  }
});

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
  console.log(`   POST /api/analyze-data-by-pk      - 파일 PK 분석 워크플로`);
  console.log(`   GET  /api/download-by-pk/:pk      - 파일 다운로드 스트리밍`);
  console.log(`   POST /api/data-utilization/full   - 전체 활용방안`);
  console.log(`   POST /api/data-utilization/single - 단일 활용방안`);
  console.log(`   GET  /health                      - 헬스 체크`);
});

export default app;
