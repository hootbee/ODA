// src/server.ts
import express, { Request, Response } from "express";
import dotenv from "dotenv";

import { PublicDataService } from "./services/PublicDataService";
import { HttpMCPClient } from "./services/PlaywrightMCPClient";
import { DataGoKrExtractor } from "./services/DataGoKrExtractor";
import { buildDataInfoFromColumns } from "./services/PromptBuilder";
import { SupabaseDbService } from "./services/SupabaseDbService";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const publicDataService = new PublicDataService();
const supabaseDb = new SupabaseDbService();

// Playwright MCP (브라우저 자동화)
const mcp = new HttpMCPClient(process.env.MCP_BRIDGE_URL); // ex) http://localhost:4310/call
const extractor = new DataGoKrExtractor(mcp);

app.use(express.json());

// ===== DB 검색 기능 =====
app.post("/api/db/by-region", async (req: Request, res: Response) => {
  try {
    const { region, limit } = req.body ?? {};
    if (!region) return res.status(400).json({ error: "region is required" });
    const rows = await supabaseDb.listByRegion(region, limit ?? 50);
    res.json({ success: true, rows });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

app.post("/api/db/search", async (req: Request, res: Response) => {
  try {
    const { keyword, limit } = req.body ?? {};
    if (!keyword) return res.status(400).json({ error: "keyword is required" });
    const rows = await supabaseDb.searchByKeyword(keyword, limit ?? 50);
    res.json({ success: true, rows });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

// ===== 컬럼 추출 =====
app.post("/api/data-columns", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "url is required" });
    const columns = await extractor.extractColumns(url);
    res.json({ url, columns });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

// ===== 활용안 (전체/단일) =====
app.post("/api/data-utilization/full", async (req: Request, res: Response) => {
  try {
    const { dataInfo } = req.body ?? {};
    if (!dataInfo) return res.status(400).json({ error: "dataInfo is required" });
    const result = await publicDataService.generateUtilizationRecommendations(dataInfo);
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

app.post("/api/data-utilization/single", async (req: Request, res: Response) => {
  try {
    const { dataInfo, analysisType } = req.body ?? {};
    if (!dataInfo || !analysisType) return res.status(400).json({ error: "dataInfo & analysisType are required" });
    const result = await publicDataService.generateSingleUtilizationRecommendation({ dataInfo, analysisType });
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

// URL → 컬럼 → 활용안 전체
app.post("/api/data-utilization/from-url", async (req: Request, res: Response) => {
  try {
    const { url, baseInfo } = req.body ?? {};
    if (!url) return res.status(400).json({ error: "url is required" });
    const columns = await extractor.extractColumns(url);
    const dataInfo = buildDataInfoFromColumns(baseInfo ?? {}, columns);
    const result = await publicDataService.generateUtilizationRecommendations(dataInfo);
    res.json({ success: true, dataInfo, data: result });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? String(e) });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "Agentica AI Service" });
});

app.listen(port, () => {
  console.log(`🚀 Agentica AI Service http://localhost:${port}`);
  console.log(`   POST /api/db/by-region`);
  console.log(`   POST /api/db/search`);
  console.log(`   POST /api/data-columns`);
  console.log(`   POST /api/data-utilization/full`);
  console.log(`   POST /api/data-utilization/single`);
  console.log(`   POST /api/data-utilization/from-url`);
  console.log(`   GET  /health`);
});

export default app;
