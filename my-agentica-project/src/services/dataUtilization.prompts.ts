import { DataInfo } from "./dataUtilization.schema";

export function buildSimplePrompt(userPrompt: string, previousResult?: any): string {
    const prev = previousResult ? JSON.stringify(previousResult, null, 2) : "";
    const safePrev = prev.length > 4000 ? prev.slice(0, 4000) + " …(truncated)" : prev;
    const context = previousResult
        ? `
# 이전 대화 내용 (참고)
아래 내용을 참고하여 사용자의 현재 요청에 답변하세요.
[이전 대화 내용 JSON]
${safePrev}
`
        : "";

    const prompt = `
# 요청사항
아래 사용자의 요구에 맞춘 답변을 생성하세요.
- 응답은 반드시 { "title": "...", "content": "..." } 형식의 JSON 객체여야 합니다.
- 마크다운, 주석, 기타 텍스트 없이 순수한 JSON 객체만 반환해야 합니다.
${context}
[사용자 요청]
${userPrompt}
`.trim();
    console.log(`[DEBUG: dataUtilization.prompts.ts] buildSimplePrompt 생성 완료:
--- PROMPT START ---
${prompt}
--- PROMPT END ---`);
    return prompt;
}

export function buildSinglePrompt(
    dataInfo: DataInfo,
    userPrompt: string,
    previousResult?: any
): string {
    const prev = previousResult ? JSON.stringify(previousResult, null, 2) : "";
    const safePrev = prev.length > 4000 ? prev.slice(0, 4000) + " …(truncated)" : prev;

    const context = previousResult
        ? `
# 이전 제안 내용 (참고)
아래 내용을 바탕으로 사용자의 요청을 더 구체적이고 연결감 있게 확장하세요.
[이전 제안 JSON]
${safePrev}
`
        : "";

    const prompt = `
# 데이터 정보
- 제목: ${dataInfo.title}
- 설명: ${dataInfo.description}

# 요청사항
아래 사용자의 요구에 맞춰 **데이터 활용 아이디어**를 1개 제안하세요.  
이 작업은 데이터베이스의 메타 정보(제목/설명 등)만 참고하며, 원본 파일은 직접 열람하지 않습니다.

# 톤 & 스타일
- 따뜻하고 명료한 한국어로 표현하세요.  
- 과도하게 기술적이거나 딱딱한 문체는 피하고, 실용적이고 자연스럽게 작성하세요.  
- 사용자의 관점에서 “이 데이터를 활용하면 어떤 점이 좋아질까?”를 중심으로 설명하세요.  
- 문단 간에 여백을 두어 읽기 쉽게 구성하세요.  
- 마크다운(굵게, 리스트 등)이나 이모지(💡📊🚀 등)를 적절히 활용해도 좋습니다.

# 출력 형식 규칙 (매우 중요)
- 전체 응답은 **순수 JSON 배열(길이 1)** 형태여야 합니다.  
- 배열의 유일한 요소는 **오직 두 개의 키만** 가집니다: "title", "content"  
- "title": 한 줄 요약 제목 (짧고 명확하게)  
- "content": 하나의 긴 문자열로 작성하되, **이스케이프 문자 없이 실제 줄바꿈(엔터)** 을 사용하세요.  
- JSON 구조에 영향을 주는 특수기호는 절대 포함하지 마세요.

📋 **구성 예시 (섹션 사이 실제 개행을 넣으세요)**

[
  {
    "title": "AI 기반 농업 데이터 자동 분석 🌾",
    "content": "요약: **농업 데이터 분석 자동화 아이디어입니다.**

기대효과: 🚀 분석 시간 단축, 인력 효율화, 실시간 의사결정 지원.

활용방법: 💡 Python + TensorFlow로 데이터 파이프라인 구성, 대시보드 시각화.

적용예시: 📊 전북 지역 온실 데이터 실시간 분석 후 이상치 자동 알림."
  }
]

[사용자 요청]
${userPrompt}
${context}
`.trim();

    console.log(
        `[DEBUG: dataUtilization.prompts.ts] buildSinglePrompt 생성 완료:
--- PROMPT START ---
${prompt}
--- PROMPT END ---`
    );

    return prompt;
}

export function buildAllRecommendationsPrompt(
    dataInfo: DataInfo,
    previousResult?: any
): string {
    const prev = previousResult ? JSON.stringify(previousResult, null, 2) : "";
    const safePrev = prev.length > 4000 ? prev.slice(0, 4000) + " …(truncated)" : prev;
    const context = previousResult
        ? `
# 이전 제안 내용 (참고)
[이전 제안 JSON]
${safePrev}
`
        : "";

    return `
# 데이터 정보
- 제목: ${dataInfo.title}
- 설명: ${dataInfo.description}

# 요청사항
아래 4개 버킷으로 활용방안을 제안하세요. 각 아이템은 반드시 title, description, content, effect 4개 필드를 모두 포함해야 합니다.
1) businessApplications
2) researchApplications
3) policyApplications
4) socialProblemApplications

- 반드시 단일 JSON "객체"로만 출력합니다(코드펜스/텍스트 금지).
${context}
`.trim();
}
