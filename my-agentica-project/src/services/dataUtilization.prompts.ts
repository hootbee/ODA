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
아래 내용을 바탕으로 사용자의 요청을 더 구체적/연결감 있게 확장하세요.
[이전 제안 JSON]
${safePrev}
`
        : "";

    const prompt = `
# 데이터 정보
- 제목: ${dataInfo.title}
- 설명: ${dataInfo.description}

# 요청사항
아래 사용자의 요구에 맞춘 활용방안 아이디어를 1개 제안하고, 반드시 지정된 JSON 형식으로만 응답하세요.

## 출력 형식 (반드시 준수)
- 전체 응답은 순수 JSON 배열(길이 1)이어야 합니다:
- 규칙 1: 마크다운, 주석, 기타 텍스트 없이 JSON만 반환하세요.
- 규칙 2:

[사용자 요청]
${userPrompt}
${context}
`.trim();
    console.log(`[DEBUG: dataUtilization.prompts.ts] buildSinglePrompt 생성 완료:
--- PROMPT START ---
${prompt}
--- PROMPT END ---`);
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
