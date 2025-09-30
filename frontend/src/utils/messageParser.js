// src/utils/messageParser.js  (merged)

// ---------- [LOCAL] Utilization Dashboard Normalizer ----------
function normalizeUtilizationPayload(content) {
  // unwrap 최대 3회까지 방어적으로 벗겨보기
  let node = content;
  for (let i = 0; i < 3; i++) {
    if (node && node.success === true && node.data) {
      node = node.data;
    }
  }

  // 카테고리 키를 가진 객체인지 확인
  if (node && typeof node === "object") {
    const keys = Object.keys(node);
    const hasCategories = [
      "businessApplications",
      "researchApplications",
      "policyApplications",
      "combinationSuggestions",
      "analysisTools",
      "socialProblemApplications",
    ].some((k) => keys.includes(k));
    if (hasCategories) {
      return { success: true, data: node };
    }
  }
  return null;
}

// ---------- [CHERRY] Helpers ----------
function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function guessSender(raw) {
  const s = raw?.sender || raw?.role || raw?.from;
  if (s === "user" || s === "human") return "user";
  if (s === "assistant" || s === "agent" || s === "bot" || s === "system")
    return "agent";
  return "agent";
}

function toObject(maybeJson) {
  if (maybeJson == null) return {};
  if (typeof maybeJson === "object") return maybeJson;
  if (typeof maybeJson === "string") {
    const str = maybeJson.trim();
    if (str.startsWith("{") || str.startsWith("[")) {
      try {
        return JSON.parse(str);
      } catch {
        return { text: maybeJson };
      }
    }
    return { text: maybeJson };
  }
  return { text: String(maybeJson) };
}

// ---------- [MERGED] Core Parser ----------
export default function parseMessage(raw) {
  const id = raw?.id || genId();
  const sender = guessSender(raw);
  const ts = Number.isFinite(raw?.timestamp) ? raw.timestamp : Date.now();

  // content 우선, 없으면 raw 자체를 내용으로
  const content = toObject(raw?.content ?? raw);

  // 기본 메시지 오브젝트(최종 반환 형태)
  const message = {
    id,
    sender,
    type: "text",
    text: "",
    data: undefined,
    timestamp: ts,
  };

  // ---------- A) [LOCAL] Utilization Dashboard 우선 감지 ----------
  // 다양한 래핑을 벗겨 카테고리 번들인지 확인
  const normalizedUtil = normalizeUtilizationPayload(content);
  if (normalizedUtil) {
    message.type = "utilization-dashboard";
    message.data = normalizedUtil; // { success: true, data: {...} }
    // local 메타데이터 호환: 파일명 같은 추가 컨텍스트를 raw에 달고 올 수 있음
    if (raw?.lastDataName) message.fileName = raw.lastDataName;
    return message;
  }

  // ---------- B) [CHERRY] 명시적 type 처리 ----------
  if (typeof content.type === "string") {
    const t = content.type;

    // data_analysis_result → data_analysis 통일
    if (t === "data_analysis_result") {
      message.type = "data_analysis";
      message.data = content; // DataAnalysisResult에서 사용
      return message;
    }

    switch (t) {
      case "text":
        message.type = "text";
        message.text = content.text ?? "";
        return message;

      case "error":
        message.type = "error";
        message.data = content;
        message.text = content.message || "오류가 발생했습니다.";
        return message;

      case "help":
        message.type = "help";
        message.data = content;
        return message;

      case "search_results":
        message.type = "search_results";
        message.data = {
          ...content,
          results: Array.isArray(content.results) ? content.results : [],
          totalCount: Number.isFinite(content.totalCount)
            ? content.totalCount
            : Array.isArray(content.results)
            ? content.results.length
            : 0,
        };
        return message;

      case "search_not_found":
        message.type = "search_not_found";
        message.data = content;
        return message;

      case "data_detail":
        message.type = "data_detail";
        message.data = content;
        return message;

      case "context_reset":
        message.type = "context_reset";
        message.data = content;
        return message;

      case "link": // [LOCAL] 유지
        message.type = "link";
        message.url = content.url;
        message.data = content;
        return message;

      case "data_analysis":
        message.type = "data_analysis";
        message.data = content;
        return message;

      case "simple_recommendation": {
        // [MERGED] 단순 추천: content 그대로도 지원 + 배열 필드 정규화
        message.type = "simple_recommendation";
        if (Array.isArray(content.recommendations)) {
          message.recommendations = content.recommendations;
        } else if (content.recommendations) {
          message.recommendations = [content.recommendations];
        } else {
          message.data = content;
        }
        return message;
      }

      // ---------- [LOCAL] 분석 타입을 simple_recommendation으로 변환 ----------
      case "business":
      case "research":
      case "policy":
      case "social_problem": {
        let rawRecommendations = content.recommendations || [];
        if (!Array.isArray(rawRecommendations)) {
          rawRecommendations = [rawRecommendations].filter(Boolean);
        }
        const convertedRecommendations = rawRecommendations.map((rec) => ({
          title: rec?.title,
          content: rec?.description || rec?.content,
          effect: rec?.effect,
        }));
        message.type = "simple_recommendation";
        message.recommendations = convertedRecommendations;
        return message;
      }

      default:
        // 알 수 없는 타입 → 안전 텍스트 처리
        if (typeof content.text === "string") {
          message.type = "text";
          message.text = content.text;
        } else {
          message.type = "text";
          message.text = JSON.stringify(content);
        }
        return message;
    }
  }

  // ---------- C) [CHERRY] 암묵적 시각화 메시지 인식 ----------
  // 타입이 없어도 dataPayload/analysis가 있으면 data_analysis로 렌더
  if (content && typeof content === "object" && (content.dataPayload || content.analysis)) {
    message.type = "data_analysis";
    message.data = content;
    return message;
  }

  // ---------- D) [LOCAL/CHERRY] 텍스트/기본 처리 ----------
  if (typeof content.text === "string") {
    message.type = "text";
    message.text = content.text;
    return message;
  }

  // 순수 문자열이었던 경우(toObject가 감싸지 못하는 경로 대비)
  if (typeof raw === "string") {
    message.type = "text";
    message.text = raw;
    return message;
  }

  // 마지막 안전장치
  message.type = "text";
  message.text = JSON.stringify(content);
  return message;
}

// 호환용 named exports
export function parseBotMessage(raw) {
  // 현재 프로젝트에서는 봇/유저 모두 동일 파서로 처리
  return parseMessage(raw);
}
export function parseUserMessage(raw) {
  return parseMessage(raw);
}
