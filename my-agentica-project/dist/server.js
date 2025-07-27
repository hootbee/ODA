"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const PublicDataService_1 = require("./services/PublicDataService");
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// PublicDataService 인스턴스 생성
const publicDataService = new PublicDataService_1.PublicDataService();
app.use(express_1.default.json());
// CORS 설정
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
        res.sendStatus(200);
    }
    else {
        next();
    }
});
// 요청 로깅 미들웨어
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
// 헬스체크 엔드포인트
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "Agentica AI Service",
        version: "1.0.0",
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
    });
});
// 검색 파라미터 추출 엔드포인트
app.post("/api/ai/search", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({
            error: "Prompt is required",
            code: "MISSING_PROMPT",
            timestamp: new Date().toISOString(),
        });
    }
    try {
        console.log("받은 검색 요청:", prompt);
        console.log("요청 시각:", new Date().toISOString());
        // PublicDataService 직접 호출
        const result = yield publicDataService.searchData({ prompt });
        console.log("직접 호출 결과:", JSON.stringify(result, null, 2));
        // 성공 응답
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("검색 에러:", error);
        // 에러 발생시 Fallback 응답
        const fallbackResponse = {
            searchYear: prompt.includes("202") ? 2025 : null,
            title: prompt.includes("문화재") ? "문화재" : "공공데이터",
            keywords: prompt,
            classificationSystem: prompt.includes("문화재")
                ? "문화체육관광-문화재"
                : "일반공공행정-일반행정",
            providerAgency: prompt.includes("인천") ? "인천광역시서구" : "기타기관",
            majorCategory: prompt.includes("문화재")
                ? "문화체육관광"
                : "일반공공행정",
            hasDateFilter: false,
            fileDataName: `fallback_${Date.now()}`,
            fileExtension: "csv",
            description: `Fallback response for: ${prompt}`,
        };
        console.log("Fallback 응답 사용:", fallbackResponse);
        res.json({
            success: true,
            data: fallbackResponse,
            fallback: true,
            timestamp: new Date().toISOString(),
        });
    }
}));
// 추천 엔드포인트
app.post("/api/ai/recommendations", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { prompt, classificationSystem, candidateNames } = req.body;
    // 입력 검증
    if (!prompt || !classificationSystem || !candidateNames) {
        return res.status(400).json({
            error: "prompt, classificationSystem, candidateNames are required",
            code: "MISSING_PARAMETERS",
            timestamp: new Date().toISOString(),
        });
    }
    if (!Array.isArray(candidateNames)) {
        return res.status(400).json({
            error: "candidateNames must be an array",
            code: "INVALID_CANDIDATES_FORMAT",
            timestamp: new Date().toISOString(),
        });
    }
    try {
        console.log("받은 추천 요청:", {
            prompt,
            classificationSystem,
            candidateCount: candidateNames.length,
            timestamp: new Date().toISOString(),
        });
        // PublicDataService 직접 호출
        const result = yield publicDataService.recommendData({
            prompt,
            category: classificationSystem,
            candidates: candidateNames,
        });
        console.log("직접 호출 추천 결과:", JSON.stringify(result, null, 2));
        // 성공 응답
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error("추천 에러:", error);
        // Fallback 응답
        const fallbackResponse = {
            recommendations: candidateNames.slice(0, 3),
            filteringSteps: {
                step1_majorCategory: "일반공공행정",
                step2_dateFiltered: false,
                step3_finalCount: Math.min(3, candidateNames.length),
                dbQueryHints: {
                    majorCategoryFilter: "일반공공행정",
                    yearFilter: null,
                    keywordFilters: [],
                },
            },
        };
        console.log("Fallback 추천 응답 사용:", fallbackResponse);
        res.json({
            success: true,
            data: fallbackResponse,
            fallback: true,
            timestamp: new Date().toISOString(),
        });
    }
}));
// 대분류 목록 조회 엔드포인트
app.get("/api/ai/categories", (req, res) => {
    const categories = [
        "지역개발",
        "교육",
        "일반공공행정",
        "재정·세제·금융",
        "환경",
        "농림",
        "사회복지",
        "산업·통상·중소기업",
        "보건",
        "문화체육관광",
        "국토·지역개발",
        "교통및물류",
        "과학기술",
    ];
    res.json({
        success: true,
        data: {
            categories,
            count: categories.length,
            description: "공공데이터 대분류 체계",
        },
        timestamp: new Date().toISOString(),
    });
});
// 통계 엔드포인트
app.get("/api/ai/stats", (req, res) => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    res.json({
        success: true,
        data: {
            service: "Agentica AI Service",
            version: "1.0.0",
            uptime: {
                seconds: Math.floor(process.uptime()),
                formatted: formatUptime(process.uptime()),
            },
            memory: {
                rss: formatBytes(memoryUsage.rss),
                heapTotal: formatBytes(memoryUsage.heapTotal),
                heapUsed: formatBytes(memoryUsage.heapUsed),
                external: formatBytes(memoryUsage.external),
            },
            system: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                pid: process.pid,
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system,
            },
        },
        timestamp: new Date().toISOString(),
    });
});
// 서비스 버전 정보 엔드포인트 (추가)
app.get("/api/ai/version", (req, res) => {
    res.json({
        success: true,
        data: {
            service: "Agentica AI Service",
            version: "1.0.0",
            description: "AI-powered public data search and recommendation service",
            features: [
                "Natural language search parameter extraction",
                "Multi-step data filtering",
                "AI-based relevance scoring",
                "Database integration optimized",
            ],
            endpoints: [
                "GET /health - Health check",
                "POST /api/ai/search - Search parameter extraction",
                "POST /api/ai/recommendations - Data recommendations",
                "GET /api/ai/categories - Available categories",
                "GET /api/ai/stats - Service statistics",
                "GET /api/ai/version - Version information",
            ],
        },
        timestamp: new Date().toISOString(),
    });
});
// ✅ 수정된 404 핸들러 (와일드카드 제거)
app.use((req, res) => {
    console.log(`404 - Path not found: ${req.method} ${req.path}`);
    res.status(404).json({
        error: "Endpoint not found",
        code: "NOT_FOUND",
        requestedPath: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        availableEndpoints: [
            "GET /health",
            "POST /api/ai/search",
            "POST /api/ai/recommendations",
            "GET /api/ai/categories",
            "GET /api/ai/stats",
            "GET /api/ai/version",
        ],
        suggestion: "Please check the available endpoints above and ensure you're using the correct HTTP method.",
    });
});
// 전역 에러 핸들러는 그대로 유지
app.use((error, req, res, next) => {
    console.error("전역 에러:", error);
    console.error("에러 스택:", error.stack);
    res.status(500).json({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        message: error.message,
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(7), // 에러 추적용 ID
    });
});
// 유틸리티 함수들
function formatBytes(bytes) {
    if (bytes === 0)
        return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
function formatUptime(uptime) {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
}
// 서버 시작 및 초기화
const server = app.listen(port, () => {
    console.log("=".repeat(60));
    console.log("🚀 Agentica AI Service Started Successfully!");
    console.log("=".repeat(60));
    console.log(`📡 Service running on: http://localhost:${port}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log(`🏥 Health check: http://localhost:${port}/health`);
    console.log(`🔍 Search API: http://localhost:${port}/api/ai/search`);
    console.log(`💡 Recommendations: http://localhost:${port}/api/ai/recommendations`);
    console.log(`📊 Categories: http://localhost:${port}/api/ai/categories`);
    console.log(`📈 Statistics: http://localhost:${port}/api/ai/stats`);
    console.log(`📄 Version info: http://localhost:${port}/api/ai/version`);
    console.log("=".repeat(60));
    // 서비스 초기화 확인
    console.log("🔧 Service components:");
    console.log("   ✅ PublicDataService initialized");
    console.log("   ✅ Express middleware configured");
    console.log("   ✅ Error handlers registered");
    console.log("   ✅ CORS enabled");
    console.log("=".repeat(60));
});
// Graceful shutdown 처리
const gracefulShutdown = (signal) => {
    console.log(`\n📴 ${signal} received, shutting down gracefully...`);
    server.close((err) => {
        if (err) {
            console.error("❌ Error during server shutdown:", err);
            process.exit(1);
        }
        console.log("✅ Server closed successfully");
        console.log("👋 Agentica AI Service stopped");
        process.exit(0);
    });
    // 강제 종료 방지 (10초 후)
    setTimeout(() => {
        console.error("⚠️  Force shutdown due to timeout");
        process.exit(1);
    }, 10000);
};
// 시그널 핸들러 등록
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
// 예외 처리
process.on("uncaughtException", (err) => {
    console.error("💥 Uncaught Exception:", err);
    console.error("Stack:", err.stack);
    process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
    console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
});
// 메모리 사용량 모니터링 (선택사항)
setInterval(() => {
    const memUsage = process.memoryUsage();
    const mbUsed = Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100;
    // 메모리 사용량이 500MB를 초과하면 경고
    if (mbUsed > 500) {
        console.warn(`⚠️  High memory usage: ${mbUsed} MB`);
    }
}, 300000); // 5분마다 체크
exports.default = app;
