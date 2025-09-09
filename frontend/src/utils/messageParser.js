// src/utils/messageParser.js

export const parseBotMessage = (content, metadata = {}) => {
  const messageObject = {
    id: metadata.id || Date.now(),
    sender: "bot",
  };

  // First, ensure content is an object if it's a JSON string
  if (typeof content === 'string') {
    try {
      content = JSON.parse(content);
    } catch (e) {
      // It's not a JSON string, treat it as plain text
      messageObject.type = "text";
      messageObject.text = String(content ?? "");
      return messageObject;
    }
  }

  // --- Check for Utilization Dashboard (Single-Wrapped) ---
  if (content && content.success && content.data) {
    const payload = content.data;
    const keys = (payload && typeof payload === 'object') ? Object.keys(payload) : [];
    const hasCategories = [
      "businessApplications", "researchApplications", "policyApplications",
      "combinationSuggestions", "analysisTools"
    ].some(k => keys.includes(k));

    if (hasCategories) {
      messageObject.type = 'utilization-dashboard';
      messageObject.data = content; // Pass the whole single-wrapped object
      messageObject.fileName = metadata.lastDataName;
      return messageObject;
    }
  }

  // --- Check for other explicit types ---
  if (content && content.type) {
    switch (content.type) {
      case "simple_recommendation":
        messageObject.type = "simple_recommendation";
        messageObject.recommendations = Array.isArray(content.recommendations)
          ? content.recommendations
          : [content.recommendations].filter(Boolean);
        return messageObject;
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
      case "data_analysis":
        messageObject.type = "data_analysis";
        messageObject.data = content;
        return messageObject;
      default:
        // Fallback for objects with a 'type' property we don't recognize
        messageObject.type = "text";
        messageObject.text = "알 수 없는 형식의 응답입니다:\n" + JSON.stringify(content, null, 2);
        return messageObject;
    }
  }

  // --- Fallback for any other kind of object ---
  messageObject.type = "text";
  messageObject.text = "알 수 없는 형식의 응답입니다:\n" + JSON.stringify(content, null, 2);
  return messageObject;
};
