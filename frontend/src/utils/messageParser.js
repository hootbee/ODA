// frontend/src/utils/messageParser.js
// 들어오는 원시 메시지를 앱 내부에서 사용하는 표준 메시지 객체로 변환합니다.
// 표준 메시지 형태 예시:
// {
//   id: string,
//   type: string,           // 'text' | 'error' | 'help' | 'search_results' | 'data_analysis' | ...
//   sender: 'user'|'agent',
//   text?: string,          // 순수 텍스트 메시지일 때
//   data?: object,          // 컴포넌트별로 사용하는 payload (ex. DataAnalysisResult)
//   timestamp?: number
// }

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function guessSender(raw) {
  // 프로젝트 상황에 맞게 보정
  // 예: raw.role, raw.sender, raw.from 등의 값이 있을 수 있음
  const s = raw?.sender || raw?.role || raw?.from;
  if (s === 'user' || s === 'human') return 'user';
  if (s === 'assistant' || s === 'agent' || s === 'bot' || s === 'system') return 'agent';
  // 기본값
  return 'agent';
}

function toObject(maybeJson) {
  if (maybeJson == null) return {};
  if (typeof maybeJson === 'object') return maybeJson;
  if (typeof maybeJson === 'string') {
    const str = maybeJson.trim();
    if (str.startsWith('{') || str.startsWith('[')) {
      try {
        return JSON.parse(str);
      } catch {
        // 텍스트이지만 JSON 파싱 실패 → 그대로 텍스트 처리
        return { text: maybeJson };
      }
    }
    return { text: maybeJson };
  }
  // 숫자/불리언 등은 안전하게 텍스트로
  return { text: String(maybeJson) };
}

export default function parseMessage(raw) {
  const id = raw?.id || genId();
  const sender = guessSender(raw);
  const ts = Number.isFinite(raw?.timestamp) ? raw.timestamp : Date.now();

  // content 우선, 없으면 raw 자체를 내용으로
  const content = toObject(raw?.content ?? raw);

  // 기본 메시지 오브젝트
  const message = {
    id,
    sender,
    type: 'text',
    text: '',
    data: undefined,
    timestamp: ts,
  };

  // ---------- 1) 명시적 type 처리 ----------
  if (typeof content.type === 'string') {
    const t = content.type;

    // ✅ 핵심 변경 1: data_analysis_result를 data_analysis로 통일
    if (t === 'data_analysis_result') {
      message.type = 'data_analysis';
      message.data = content; // DataAnalysisResult에서 사용 (dataPayload, publicDataPk, analysis 등)
      return message;
    }

    // 자주 쓰는 타입들 스위치
    switch (t) {
      case 'text':
        message.type = 'text';
        message.text = content.text ?? '';
        return message;

      case 'error':
        message.type = 'error';
        message.data = content;
        message.text = content.message || '오류가 발생했습니다.';
        return message;

      case 'help':
        message.type = 'help';
        message.data = content;
        return message;

      case 'search_results':
        message.type = 'search_results';
        message.data = {
          ...content,
          results: Array.isArray(content.results) ? content.results : [],
          totalCount: Number.isFinite(content.totalCount)
          ? content.totalCount
          : (Array.isArray(content.results) ? content.results.length : 0),
        };
        return message;

      case 'search_not_found':
        message.type = 'search_not_found';
        message.data = content;
        return message;

      case 'simple_recommendation':
        message.type = 'simple_recommendation';
        message.data = content;
        return message;

      case 'context_reset':
        message.type = 'context_reset';
        message.data = content;
        return message;

      case 'data_detail':
        message.type = 'data_detail';
        message.data = content;
        return message;

      case 'data_analysis':
        // 기존 렌더링 컴포넌트(DataAnalysisResult)는 message.data를 사용
        message.type = 'data_analysis';
        message.data = content;
        return message;

      default:
        // 알 수 없는 타입 → 안전하게 텍스트 또는 데이터로 처리
        if (typeof content.text === 'string') {
          message.type = 'text';
          message.text = content.text;
        } else {
          message.type = 'text';
          message.text = JSON.stringify(content);
        }
        return message;
    }
  }

  // ---------- 2) 암묵적 시각화 메시지 인식(휴리스틱) ----------
  // ✅ 핵심 변경 2: 타입이 없어도 dataPayload가 있으면 시각화 메시지로 간주
  if (content && typeof content === 'object' && (content.dataPayload || content.analysis)) {
    message.type = 'data_analysis';
    message.data = content; // DataAnalysisResult가 그대로 사용
    return message;
  }

  // ---------- 3) 텍스트/기본 처리 ----------
  if (typeof content.text === 'string') {
    message.type = 'text';
    message.text = content.text;
    return message;
  }

  // content가 순수 문자열이었다면 위 toObject에서 {text: "..."}로 감싸짐
  if (typeof raw === 'string') {
    message.type = 'text';
    message.text = raw;
    return message;
  }

  // 마지막 안전장치: 내용 전체를 문자열화
  message.type = 'text';
  message.text = JSON.stringify(content);
  return message;
}

// 호환용 named export (ChatPage.js가 사용)
export function parseBotMessage(raw) {
  // 현재 프로젝트에서는 봇/유저 모두 동일 파서로 처리해도 무방
  return parseMessage(raw); // <- 파일 내 default export 함수 이름
}

export function parseUserMessage(raw) {
  return parseMessage(raw);
}
