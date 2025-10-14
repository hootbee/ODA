import React from "react";
import styled from "styled-components";

const HelpMessage = () => (
  <HelpContainer>
    <h4>
      <span role="img" aria-label="icon">
        👋
      </span>{" "}
      안녕하세요! ODA(Open Data Assistant)입니다.
    </h4>
    <p>
      저는 공공 데이터를 찾고 활용하는 것을 돕는 AI 챗봇입니다. 다음과 같이
      질문해보세요:
    </p>
    <HelpList>
      <li>
        <strong>특정 데이터 검색:</strong> '서울시 교통 데이터 보여줘'
      </li>
      <li>
        <strong>데이터 상세 정보:</strong> '/자세히 [파일명]'
      </li>
      <li>
        <strong>데이터 활용 방안:</strong> '/종합활용' 또는 '/활용 [원하는 방식/목적]'
      </li>
      <li>
        <strong>자유로운 대화:</strong> '/자유 [원하는 방식/목적]'
      </li>
      <li>
        <strong>데이터 파일 다운로드 및 분석:</strong> '/데이터 확인'
      </li>
      <li>
        <strong>새로운 데이터 검색 시작:</strong> '/다른 데이터'
      </li>
    </HelpList>
    <p id="refer">
      ※ 본 서비스는 '서울 열린데이터 광장(https://data.seoul.go.kr/)'의 데이터를 활용하여 제공됩니다.
    </p>
  </HelpContainer>
);

export default HelpMessage;

const HelpContainer = styled.div`
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 20px;
  h4 {
    font-size: 1.2em;
    color: #111827;
    margin: 0 0 12px 0;
  }
  p {
    color: #374151;
    margin: 0 0 16px 0;
    line-height: 1.6;
  }

  #refer {
    font-size: 0.75em;
    margin-top: 12px;
    color: #677386ff;
    }
`;

const HelpList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  li {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 8px;
    font-size: 0.95em;
    color: #4b5563;
    strong {
      color: #374151;
    }
  }
`;
