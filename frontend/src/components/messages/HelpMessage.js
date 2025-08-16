import React from 'react';
import styled from 'styled-components';

const HelpMessage = () => (
    <HelpContainer>
        <h4><span role="img" aria-label="icon">👋</span> 안녕하세요! ODA(Open Data Assistant)입니다.</h4>
        <p>저는 공공 데이터를 찾고 활용하는 것을 돕는 AI 챗봇입니다. 다음과 같이 질문해보세요:</p>
        <HelpList>
            <li><strong>특정 데이터 검색:</strong> '서울시 교통 데이터 보여줘'</li>
            <li><strong>데이터 상세 정보:</strong> '[파일명] 자세히' 또는 '[파일명] 상세정보'</li>
            <li><strong>데이터 활용 방안:</strong> '[파일명] 전체 활용' 또는 '[파일명] 비즈니스 활용'</li>
            <li><strong>새로운 데이터 검색 시작:</strong> '다른 데이터 조회'</li>
        </HelpList>
    </HelpContainer>
);

export default HelpMessage;

const HelpContainer = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 20px;
  h4 { font-size: 1.2em; color: #111827; margin: 0 0 12px 0; }
  p { color: #374151; margin: 0 0 16px 0; line-height: 1.6; }
`;

const HelpList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  li { background: #ffffff; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; margin-bottom: 8px; font-size: 0.95em; color: #4b5563; strong { color: #1f2937; } }
`;
