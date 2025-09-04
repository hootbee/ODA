export const parseBotMessage = (content, metadata = {}) => {
  const messageObject = {
    id: metadata.id || Date.now(),
    sender: 'bot',
  };

  if (typeof content === 'object' && content !== null) {
    switch (content.type) {
      case 'search_results':
        messageObject.type = 'search_results';
        messageObject.data = content.payload;
        break;
      case 'search_not_found':
        messageObject.type = 'search_not_found';
        messageObject.data = content.payload;
        break;
      case 'simple_recommendation':
        messageObject.type = 'simple_recommendation';
        // Ensure recommendations is always an array to prevent .map errors
        messageObject.recommendations = Array.isArray(content.recommendations)
          ? content.recommendations
          : [content.recommendations].filter(Boolean); // Wrap single object/string in an array, filter out null/undefined
        break;
      case 'data_detail':
        messageObject.type = 'data_detail';
        messageObject.data = content.payload;
        break;
      case 'context_reset':
        messageObject.type = 'context_reset';
        break;
      case 'error':
        messageObject.type = 'error';
        messageObject.text = content.message;
        break;
      case 'help':
        messageObject.type = 'help';
        break;
      case 'data_analysis': // Add this case for data analysis results
        messageObject.type = 'data_analysis';
                messageObject.data = content; // content 객체 전체를 전달하여 publicDataPk가 유지되도록 함
        break;
      default:
        // `utilization-dashboard`는 `success` 필드를 사용하므로 별도 처리
        if (content.success && content.data) {
          messageObject.type = 'utilization-dashboard';
          messageObject.data = content.data;
          messageObject.fileName = metadata.lastDataName;
        } else {
          messageObject.text = Array.isArray(content) ? content.join('\n') : JSON.stringify(content, null, 2);
        }
        break;
    }
  } else {
    messageObject.text = String(content);
  }

  return messageObject;
};