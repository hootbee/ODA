import { DataInfo } from "./dataUtilization.schema";

export function buildSimplePrompt(userPrompt: string, previousResult?: any): string {
    const prev = previousResult ? JSON.stringify(previousResult, null, 2) : "";
    const safePrev = prev.length > 3000 ? prev.slice(0, 3000) + " …(truncated)" : prev;
    const context = previousResult
        ? `
# 이전 대화 내용 (참고)
아래 내용을 참고하여 사용자의 현재 요청에 답변하세요.
[이전 대화 내용 JSON]
${safePrev}
`
        : "";

    const prompt = `
# 임무
당신은 사용자의 질문에 마크다운 형식으로 답변하는 AI 어시스턴트입니다.

# 출력 규칙 (마크다운 엄격)
- 답변은 항상 마크다운 형식으로 작성하세요.
- 코드 예시나 아키텍처 설명도 자유롭게 포함할 수 있습니다.
- **연속된 빈 줄은 최대 한 개(\n\n)까지만 허용**합니다. 세 줄 이상은 금지하고, 하나의 빈 줄만 유지하세요.
- **개행은 항상 \\n만 사용**하세요. \\r\\n, 탭(\\t), 공백이 섞인 개행(\`\\n \\n\`)은 절대 사용하지 마세요.
- **헤딩 규칙**: \`#\`, \`##\`, \`###\` 뒤에는 **반드시 한 칸 공백**을 두세요(예: \`## 제목\`). 헤딩 **앞뒤로 각각 빈 줄 1개**를 유지하세요.
- **리스트 규칙**: 불릿은 줄 시작에서 \`* \` 또는 \`- \`로 시작하세요(앞에 공백 금지). 불릿 기호 뒤에는 **한 칸 공백**을 두세요.
- **불필요한 선행/후행 공백, 줄 끝 공백**은 제거하세요.
- 답변에 제목을 포함할 필요는 없습니다.

${context}

# 사용자 요청
"${userPrompt}"
`.trim();

    console.log(`[DEBUG: dataUtilization.prompts.ts] buildSimplePrompt 생성 완료:\n--- PROMPT START ---\n${prompt}\n--- PROMPT END ---`);
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
아래 사용자의 요구를 반영해 **데이터 활용 아이디어**를 1개 제시하세요.
이 작업은 데이터베이스의 메타 정보(제목/설명 등)만 참고하며, 원본 파일은 직접 열람하지 않습니다.

# 톤 & 스타일
- 따뜻하고 명료한 한국어, 실용적이고 자연스러운 문체
- 과도한 기술 용어/딱딱한 표현 지양
- 문단 사이에는 최대 1개의 빈 줄만 사용

# 출력 형식 (반드시 준수)
- 전체 응답은 **순수 JSON 배열(길이 1)**
- 배열의 유일한 요소는 **{ "title": string, "content": string }** 만 포함
- "content"는 아래 **섹션 제목을 굵게** 표기하고, **순서대로 모두 포함**:
  1) **배경 및 목적**
  2) **활용 시나리오**
  3) **기대효과**

# 마크다운 및 개행 규칙
- 실제 줄바꿈(\\n)만 사용하고, 연속 빈 줄은 최대 1개(\\n\\n)까지
- 헤딩 기호(#, ## 등) 사용 금지, 섹션 제목은 **굵게**만 사용
- 불릿은 줄 시작에서 "- " 또는 "* "로 시작

# 예시 (형식 참고용, 그대로 복사 금지)
[
  {
    "title": "도시 대기질 개선을 위한 생활밀착형 알림 서비스",
    "content": "**배경 및 목적**\\n도시 대기오염 데이터를 일상 판단에 연결해 시민의 건강 보호를 돕는다.\\n\\n**활용 시나리오**\\n- 미세먼지 농도 급증 시 맞춤 알림 발송\\n- 어린이집/노인복지시설 대상 실내 활동 가이드 제공\\n\\n**기대효과**\\n- 야외활동 위험 회피로 건강 위험도 감소\\n- 행정의 선제적 대응력 향상\\n\\n**구현 단계**\\n1. 데이터 수집·정합 체크\\n2. 알림 로직·임계치 설계\\n3. 파일럿 운영 및 피드백 반영\\n4. 대시보드·운영 매뉴얼 확정\\n\\n**데이터·기술 검증 항목**\\n- 결측/이상치 비율, 시간 동기화, 단위 일관성\\n- 알림 오탐/미탐 비율\\n\\n**성과 지표(KPI)**\\n- 고농도 시 알림 도달률 95% 이상\\n- 알림 후 야외활동 감소율 15% 개선\\n- 민원/불편 신고 10% 감소"
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
