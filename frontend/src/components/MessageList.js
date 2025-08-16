import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import UtilizationDashboard from "./UtilizationDashboard";
import ReactMarkdown from 'react-markdown';

function MessageList({ messages, onCategorySelect, isTyping, scrollContainerRef, messageEndRef, onScroll }) {

  // props 추가
  return (
    <MessageListContainer ref={scrollContainerRef} onScroll={onScroll}>
      {messages.map((message) => (
        <MessageItem key={message.id} sender={message.sender} type={message.type}>
          {message.type === "context_reset" ? (
            <ContextResetMessage>
                <p>🔄 데이터 선택이 해제되었습니다.</p>
                <span>새로운 데이터를 검색하고 싶으시면 원하는 키워드를 입력해주세요.</span>
                <small>예: '서울시 교통 데이터', '부산 관광 정보' 등</small>
            </ContextResetMessage>
          ) : message.type === "utilization-dashboard" ? (
            <UtilizationDashboard
              data={message.data}
              fileName={message.fileName}
              onCategorySelect={onCategorySelect}
            />
          ) : (
            <>
              {message.type === "simple_recommendation" && message.recommendations ? (
                <RecommendationList>
                  {message.recommendations.map((rec, index) => (
                    <RecommendationItem key={index}>
                      <ReactMarkdown>{rec}</ReactMarkdown>
                    </RecommendationItem>
                  ))}
                </RecommendationList>
              ) : (
                <MessageText>
                  <ReactMarkdown>{message.text || ''}</ReactMarkdown>
                </MessageText>
              )}
              {message.type === "simple_recommendation" && (
                <TipMessage>
                  💡 다른 데이터 조회를 원하시면 '다른 데이터 활용'을 입력하시고, 다른 활용방안을 원하시면 프롬프트를 작성해주세요.
                </TipMessage>
              )}
              {message.type === "data_detail" && (
                <DetailHint>
                  <p>💡 이 데이터를 어떻게 활용하고 싶으신가요? 자유롭게 질문해주세요!</p>
                  <strong>예시:</strong>
                  <ul>
                    <li>"전체 활용" - 모든 활용방안 대시보드 🔍</li>
                    <li>"해외 사례와 연관 지어 활용"</li>
                    <li>"[특정 목적]을 위한 활용" - 예: "마케팅 전략 수립을 위한 활용"</li>
                  </ul>
                </DetailHint>
              )}
            </>
          )}
        </MessageItem>
      ))}

      {isTyping && (
        <MessageItem sender="bot">
          <TypingIndicator>
            <Spinner />
            <span>입력 중...</span>
          </TypingIndicator>
        </MessageItem>
      )}

      <div ref={messageEndRef} />
    </MessageListContainer>
  );
}

// ============== Styled Components ==============

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Spinner = styled.div`
  width: 18px;
  height: 18px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: #888; 
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  `;

const MessageListContainer = styled.div`
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
  position: relative;
`;

const MessageItem = styled.div`
  padding: ${(props) =>
    props.type === 'context_reset' || props.children?.props?.data ? "0" : "10px 15px"}; // 컨텍스트 리셋 또는 대시보드일 때 패딩 제거
  border-radius: 20px;
  max-width: ${(props) =>
    props.type === 'context_reset' || props.children?.props?.data ? "95%" : "70%"}; // 컨텍스트 리셋 또는 대시보드일 때 더 넓게
  word-wrap: break-word;
  white-space: pre-wrap;
  background-color: ${(props) => {
    if (props.type === 'context_reset') return `transparent`; // 컨텍스트 리셋 메시지는 투명 배경
    // 대시보드 메시지는 투명 배경
    if (props.children?.props?.data) return `background: transparent; padding: 0; box-shadow: none;`;
    return props.sender === "user" ? "#0099ffff" : "#e9e9eb";
  }};
  color: ${(props) => (props.sender === "user" ? "white" : "black")};
  align-self: ${(props) =>
    props.sender === "user" ? "flex-end" : "flex-start"};

  /* 대시보드 메시지일 때 특별한 스타일 */
  ${(props) =>
    props.children?.props?.data &&
    `
    background: none;
    padding: 0;
    border-radius: 0;
  `}
`;

const MessageText = styled.div`
  line-height: 1.5;
  text-align: left;

  p {
    margin: 0;
  }

  strong {
    font-weight: 600;
    color: #000000ff;
  }

  h3 {
    font-size: 1.2em;
    margin: 0;
    padding-bottom: 10px;
    border-bottom: 1px solid #bcbcbcff;
  }

  hr {
    display: none;
  }

  p > strong {
    margin-right: 3px;
  }

  ul {
    padding-left: 20px;
    margin: 0;
  }

  li {
    margin-bottom: 0px;
  }

  blockquote {
    margin: 0;
    padding: 0 15px; 
    background-color: #f7f9fc;
    border-left: 4px solid #0099ffff;
    border-radius: 0 8px 8px 0;
    color: #4a5568;
  }
`;

const ContextResetMessage = styled.div`
  padding: 12px 18px;
  border: 1px solid #e0e7ff;
  background-color: #fafbff;
  border-radius: 15px;
  text-align: center;
  width: 100%;
  max-width: 100%;
  align-self: center;

  p {
    font-weight: 600;
    font-size: 1.05em;
    color: #374151;
    margin: 0 0 8px 0;
  }

  span {
    font-size: 0.95em;
    color: #6b7280;
    display: block;
    margin-bottom: 10px;
  }

  small {
    font-size: 0.9em;
    color: #9ca3af;
  }
`;

const RecommendationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
`;

const RecommendationItem = styled.div`
  background-color: #f8f9fa;
  padding: 10px 15px;
  border-radius: 10px;
  border: 1px solid #e9ecef;
  line-height: 1.5;

  p {
    margin: 0;
  }
`;

const TipMessage = styled.div`
  margin-top: 12px;
  padding: 10px 15px;
  background-color: #f0f7ff;
  border-radius: 15px;
  font-size: 0.9em;
  color: #4a5568;
  line-height: 1.5;
  text-align: left;
`;

const DetailHint = styled.div`
  margin-top: 12px;
  padding: 10px 15px;
  background-color: #f0f7ff;
  border-radius: 15px;
  font-size: 0.9em;
  color: #4a5568;
  line-height: 1.5;
  text-align: left;

  p {
    margin: 0 0 8px 0;
    font-weight: 500;
  }

  strong {
    font-weight: 600;
  }

  ul {
    list-style-type: '• ';
    padding-left: 1.2em;
    margin: 5px 0 0 0;
  }

  li {
    margin-bottom: 4px;
  }
`;

export default MessageList;
