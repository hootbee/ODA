import React from 'react';
import styled from 'styled-components';

const ContextResetMessage = () => (
    <StyledMessage>
        <p>🔄 데이터 선택이 해제되었습니다.</p>
        <span>새로운 데이터를 검색하고 싶으시면 원하는 키워드를 입력해주세요.</span>
        <small>예: '서울시 교통 데이터', '부산 관광 정보' 등</small>
    </StyledMessage>
);

export default ContextResetMessage;

const StyledMessage = styled.div`
  padding: 12px 18px;
  border: 1px solid #e0e7ff;
  background-color: #fafbff;
  border-radius: 15px;
  text-align: center;
  width: 100%;
  max-width: 100%;
  align-self: center;
  p { font-weight: 600; font-size: 1.05em; color: #374151; margin: 0 0 8px 0; }
  span { font-size: 0.95em; color: #6b7280; display: block; margin-bottom: 10px; }
  small { font-size: 0.9em; color: #9ca3af; }
`;
