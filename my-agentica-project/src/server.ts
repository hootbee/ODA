import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import * as path from "path";
import { PublicDataService } from "./services/PublicDataService";
import { geminiClient, DEFAULT_GEMINI_MODEL } from "./lib/aiClient";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const publicDataService = new PublicDataService({
    llm: geminiClient,
    model: DEFAULT_GEMINI_MODEL,
    downloadsDir: path.resolve(__dirname, "../downloads"),
});

app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") res.sendStatus(200);
    else next();
});

const getErrorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

/* ===== 통합 분석 ===== */
app.post("/api/analyze-data-by-pk", async (req, res) => {
    const { publicDataPk, prompt } = req.body;
    if (!publicDataPk) return res.status(400).json({ error: "publicDataPk is required" });
    try {
        const result = await publicDataService.analyzeDataByPk({ publicDataPk, prompt });
        res.json(result);
    } catch (error) {
        console.error("[Workflow] Error:", error);
        res.status(500).json({ error: "Failed to complete the analysis workflow", message: getErrorMessage(error) });
    }
});

/* ===== 파일 다운로드 ===== */
app.get("/api/download-by-pk/:publicDataPk", async (req, res) => {
    const { publicDataPk } = req.params;
    if (!publicDataPk) return res.status(400).json({ error: "publicDataPk is required" });
    try {
        const { buffer, fileName, contentType } = await publicDataService.downloadFileBuffer(publicDataPk);
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
        res.setHeader("Content-Type", contentType);
        res.send(buffer);
    } catch (error) {
        console.error(`[Download] Error for PK ${publicDataPk}:`, error);
        res.status(500).json({ error: "Failed to download the file", message: getErrorMessage(error) });
    }
});

/* ===== 전체 활용(4버킷) — 프론트 파서가 그대로 인식 ===== */
app.post("/api/data-utilization/full", async (req, res) => {
    const dataInfo =
        req.body.dataInfo ?? {
            title: req.body.title,
            description: req.body.description,
            keywords: req.body.keywords,
            category: req.body.category,
        };

    if (!dataInfo?.title || !dataInfo?.description || !dataInfo?.keywords || !dataInfo?.category) {
        return res.status(400).json({ error: "dataInfo or {title, description, keywords, category} is required" });
    }

    try {
        console.log("📊 전체 활용방안 요청:", dataInfo.title);
        const dto = await publicDataService.generateAllUtilizationRecommendations({
            dataInfo,
            prompt: req.body.prompt ?? "전체 활용방안",
        });
        res.json({ success: true, data: dto }); // 프론트 normalizeUtilizationPayload가 인식
    } catch (error) {
        console.error("전체 활용방안 생성 오류:", error);
        res.status(500).json({ error: "Failed to generate full utilization recommendations", message: getErrorMessage(error) });
    }
});

/* ===== 단일/심플 통합: prompt 앞머리로 자동 분기
   - '!활용 ...'  → single 모드
   - 그 외       → simple 모드(프롬프트 패스스루)
   응답은 항상 { type:"simple_recommendation", recommendations:[{title, content}], meta:{mode} }
*/
app.post("/api/data-utilization/single", async (req, res) => {
    console.log("\n[DEBUG: server.ts] --------------------------------------------------");
    console.log("[DEBUG: server.ts] /api/data-utilization/single 엔드포인트 요청 수신");
    console.log("[DEBUG: server.ts] Request Body:", JSON.stringify(req.body, null, 2));

    const dataInfo =
        req.body.dataInfo ?? {
            title: req.body.title,
            description: req.body.description,
            keywords: req.body.keywords,
            category: req.body.category,
        };
    
    // [수정] req.body.prompt와 req.body.analysisType을 모두 확인하여 프롬프트를 가져옴
    const prompt: string = req.body.prompt || req.body.analysisType || "";

    if (!dataInfo?.title || !dataInfo?.description || !dataInfo?.keywords || !dataInfo?.category || !prompt) {
        console.error("[DEBUG: server.ts] 필수 파라미터 누락으로 400 에러 응답. prompt 값:", prompt);
        return res.status(400).json({
            type: "error",
            recommendations: [{ title: "요청 오류", content: "dataInfo(또는 title/description/keywords/category)와 prompt가 필요합니다." }],
        });
    }

    try {
        console.log(`[DEBUG: server.ts] PublicDataService.generateOneOrSimple 호출 예정...`);
        const dto = await publicDataService.generateOneOrSimple({ dataInfo, prompt });
        console.log("[DEBUG: server.ts] PublicDataService로부터 받은 최종 DTO:", JSON.stringify(dto, null, 2));
        console.log("[DEBUG: server.ts] 클라이언트에 성공 응답 전송");
        return res.json({ type: dto.type, recommendations: dto.recommendations, meta: dto.meta });
    } catch (error) {
        console.error("[DEBUG: server.ts] 단일/심플 생성 중 예외 발생:", error);
        res.status(500).json({
            type: "error",
            recommendations: [{ title: "예외 발생", content: getErrorMessage(error) }],
        });
    }
});

/* ===== 헬스 ===== */
app.get("/health", (_req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString(), service: "Agentica AI Service" });
});

/* ===== 서버 시작 ===== */
app.listen(port, () => {
    console.log(`🚀 Agentica AI Service running on http://localhost:${port}`);
    console.log(`   POST /api/analyze-data-by-pk`);
    console.log(`   GET  /api/download-by-pk/:publicDataPk`);
    console.log(`   POST /api/data-utilization/full`);
    console.log(`   POST /api/data-utilization/single`);
    console.log(`   GET  /health`);
});

export default app;