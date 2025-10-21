// src/utils/messageParser.js

// 내부 헬퍼: 다양한 래핑을 단일 포맷으로 정규화
function normalizeUtilizationPayload(content) {
  // unwrap 최대 3회까지 방어적으로 벗겨보기
  let node = content;
  for (let i = 0; i < 3; i++) {
    if (node && node.success === true && node.data) {
      node = node.data;
    }
  }

  // 이제 node가 카테고리 묶음을 바로 들고 있으면 성공
  if (node && typeof node === "object") {
    const keys = Object.keys(node);
    const hasCategories = [
      "businessApplications",
      "researchApplications",
      "policyApplications",
      "combinationSuggestions",
      "analysisTools",
      "socialProblemApplications"
    ].some((k) => keys.includes(k));
    if (hasCategories) {
      return { success: true, data: node };
    }
  }

  return null;
}
// src/utils/messageParser.js

export const parseBotMessage = (content, metadata = {}) => {
  const messageObject = {
    id: metadata.id || Date.now(),
    sender: "bot",
  };

  console.log("🔧 parseBotMessage 시작:", content);

  // 문자열이면 JSON 시도
  if (typeof content === "string") {
    try {
      content = JSON.parse(content);
    } catch {
      messageObject.type = "text";
      messageObject.text = String(content ?? "");
      return messageObject;
    }
  }

  // --- Utilization Dashboard: 다양한 래핑 정규화 후 판단 ---
  const normalized = normalizeUtilizationPayload(content);
  if (normalized) {
    messageObject.type = "utilization-dashboard";
    messageObject.data = normalized;
    messageObject.fileName = metadata.lastDataName;
    console.log("✅ utilization-dashboard 파싱 완료");
    return messageObject;
  }

  // --- 명시적 type 처리 ---
  if (content && content.type) {
    switch (content.type) {
      case "simple_recommendation":
        console.log("🔧 simple_recommendation 파싱:", content.recommendations);
        messageObject.type = "simple_recommendation";
        messageObject.recommendations = Array.isArray(content.recommendations)
            ? content.recommendations
            : [content.recommendations].filter(Boolean);
        console.log("✅ simple_recommendation 파싱 완료:", messageObject.recommendations);
        return messageObject;

        // 🔧 미리 정의된 분석 타입들 - 수정된 버전
      case "business":
      case "research":
      case "policy":
      case "social_problem":
        console.log(`🔧 ${content.type} 타입 원본:`, content);

        // ✅ recommendations 필드에서 실제 배열 추출 후 변환
        let rawRecommendations = content.recommendations || [];

        // 배열이 아닌 경우 배열로 변환
        if (!Array.isArray(rawRecommendations)) {
          rawRecommendations = [rawRecommendations].filter(Boolean);
        }

        // description을 content로 변환
        const convertedRecommendations = rawRecommendations.map(rec => {
          console.log(`🔧 개별 추천 변환:`, rec);
          return {
            title: rec.title,
            content: rec.description || rec.content,
            effect: rec.effect
          };
        });

        messageObject.type = "simple_recommendation";
        messageObject.recommendations = convertedRecommendations;
        console.log(`✅ ${content.type} 최종 변환:`, messageObject.recommendations);
        return messageObject;

        // 나머지 케이스들...
      case "search_results":
        messageObject.type = "search_results";
        messageObject.data = content.payload;
        return messageObject;
      case "search_not_found":
        messageObject.type = "search_not_found";
        messageObject.data = content.payload;
        return messageObject;
      case "data_detail":
        messageObject.type = "data_detail";
        messageObject.data = content.payload;
        return messageObject;
      case "context_reset":
        messageObject.type = "context_reset";
        return messageObject;
      case "error":
        messageObject.type = "error";
        messageObject.text = content.message || "오류가 발생했습니다.";
        return messageObject;
      case "help":
        messageObject.type = "help";
        return messageObject;
      case "link":
        messageObject.type = "link";
        messageObject.url = content.url;
        return messageObject;
      case "data_analysis":
        messageObject.type = "data_analysis";
        messageObject.data = content;
        return messageObject;
      case "data_visualization":
        messageObject.type = "data_visualization";
        messageObject.data = content;
        return messageObject;
      default:
        console.warn("⚠️ 알 수 없는 타입:", content.type);
        messageObject.type = "text";
        messageObject.text =
            "알 수 없는 형식의 응답입니다:\n" + JSON.stringify(content, null, 2);
        return messageObject;
    }
  }

  // --- 기타 객체는 안전하게 텍스트로 ---
  console.warn("⚠️ 기타 객체를 텍스트로 처리:", content);
  messageObject.type = "text";
  messageObject.text =
      "알 수 없는 형식의 응답입니다:\n" + JSON.stringify(content, null, 2);
  return messageObject;
};
