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

/* ===== 하이브리드 검색 엔드포인트 ===== */
app.post("/api/search-hybrid", async (req, res) => {
    console.log(`[Agent] Received request on /api/search-hybrid`);
    console.log(`[Agent] Request body:`, req.body);
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: "prompt is required" });
    }

    try {
        // PublicDataService에 이미 생성된 쿼리 플래너 사용
        const finalPlan = await publicDataService.createQueryPlan({ prompt });

        // 생성된 최종 계획으로 Java 백엔드에 검색 실행 요청
        console.log("Executing search with final plan:", finalPlan);
        const searchResponse = await fetch("http://backend:8080/api/execute-plan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(finalPlan),
        });

        if (!searchResponse.ok) {
            const errorBody = await searchResponse.text();
            throw new Error(`Java backend search failed with status: ${searchResponse.status}, body: ${errorBody}`);
        }

        const searchResult = await searchResponse.json();
        
        // 최종 결과를 클라이언트에 반환
        res.json(searchResult);

    } catch (error) {
        console.error("[HybridSearch] Error:", error);
        res.status(500).json({ error: "Failed to complete the hybrid search", message: getErrorMessage(error) });
    }
});

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

    // 서울시 포털 상세 페이지 URL 생성
    const datasetViewUrl = `https://data.seoul.go.kr/dataList/${encodeURIComponent(publicDataPk)}/S/1/datasetView.do`;

    try {
        const { buffer, fileName, contentType } = await publicDataService.downloadFileBuffer(datasetViewUrl);
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
    console.log(`   POST /api/search-hybrid`);
    console.log(`   POST /api/analyze-data-by-pk`);
    console.log(`   GET  /api/download-by-pk/:publicDataPk`);
    console.log(`   POST /api/data-utilization/full`);
    console.log(`   POST /api/data-utilization/single`);
    console.log(`   GET  /health`);
});

/* ===== 테스트 다운로드 (서울 포털/직접 URL 재생용) ===== */

/**
 * GET /test-download/:id
 * - :id 예) OA-21090
 * - 내부에서 서울시 데이터셋 상세 URL로 변환 후 다운로드 시도
 */
app.get("/test-download/:id", async (req: Request, res: Response) => {
    const { id } = req.params;

    // 간단 유효성 체크
    if (!id || !/^[A-Za-z0-9\-_]+$/.test(id)) {
        return res.status(400).json({ error: "invalid id" });
    }

    // 서울시 포털 상세 페이지 URL 생성
    const datasetViewUrl = `https://data.seoul.go.kr/dataList/${encodeURIComponent(id)}/S/1/datasetView.do`;

    try {
        // PublicDataService.downloadFileBuffer는 source 문자열(서울 포털 URL/PK 등)을 받아 버퍼 반환
        const { buffer, fileName, contentType } = await publicDataService.downloadFileBuffer(datasetViewUrl);

        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
        res.setHeader("Content-Type", contentType || "application/octet-stream");
        return res.send(buffer);
    } catch (err) {
        console.error("[TestDownload GET] error:", err);
        return res.status(500).json({ error: "download_failed", message: getErrorMessage(err) });
    }
});

/**
 * POST /test-download
 * body: { id?: string, portal?: "seoul"|"data"|"url", directUrl?: string }
 * - portal==="seoul"  : id 필수 (예: OA-21090)
 * - portal==="data"   : id 에 data.go.kr의 PK/식별자 전달
 * - portal==="url"    : directUrl 필수
 */
app.post("/test-download", async (req: Request, res: Response) => {
    const { id, portal = "seoul", directUrl } = req.body || {};

    try {
        let source: string;
        if (portal === "url") {
            if (!directUrl) return res.status(400).json({ error: "directUrl required when portal==='url'" });
            source = String(directUrl);
        } else if (portal === "seoul") {
            if (!id) return res.status(400).json({ error: "id required for portal==='seoul'" });
            source = `https://data.seoul.go.kr/dataList/${encodeURIComponent(String(id))}/S/1/datasetView.do`;
        } else if (portal === "data") {
            if (!id) return res.status(400).json({ error: "id required for portal==='data'" });
            // 기존 data.go.kr PK를 그대로 넘김 (서비스 내부에서 처리)
            source = String(id);
        } else {
            return res.status(400).json({ error: "unsupported portal" });
        }

        const { buffer, fileName, contentType } = await publicDataService.downloadFileBuffer(source);

        console.log(`[Download] fileName=${fileName}, contentType=${contentType}, bytes=${buffer?.byteLength}`);

        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
        res.setHeader("Content-Type", contentType || "application/octet-stream");
        return res.send(buffer);
    } catch (err) {
        console.error("[TestDownload POST] error:", err);
        return res.status(500).json({ error: "download_failed", message: getErrorMessage(err) });
    }
});
/* ===== (신규) 테스트: 다운로드 후 분석 =====
 * POST /api/test-download-and-analyze
 * body: {
 *   id?: string,
 *   portal?: "seoul" | "data" | "url",   // 기본 "seoul"
 *   directUrl?: string,                   // portal==="url"일 때 필수
 *   fileDetailSn?: number,                // data.go.kr에서 파일 인덱스
 *   saveDir?: string,                     // 기본: ./downloads/tmp
 *   prompt?: string                       // 분석 요구사항(없으면 기본 프롬프트)
 * }
 * - 동작: 입력 식별자로 파일을 로컬에 저장 → CSV 분석 → "보고서"를 터미널(console)로 출력
 * - 응답: 최소 메타정보만 JSON으로 반환
 */
app.post("/api/test-download-and-analyze", async (req: Request, res: Response) => {
    console.log("\n[TEST] ===== /api/test-download-and-analyze 호출 =====");
    try {
        const result = await publicDataService.downloadAndAnalyze(req.body);
        return res.json(result);
    } catch (err) {
        console.error("[TEST] 다운로드/분석 중 오류:", err);
        return res.status(500).json({ ok: false, error: "download_or_analysis_failed", message: getErrorMessage(err) });
    }
});
export default app;