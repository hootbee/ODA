import React, { useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import UtilizationDashboard from "./UtilizationDashboard";
import ReactMarkdown from 'react-markdown';

function MessageList({ messages, onCategorySelect, isTyping }) {
  const messageEndRef = useRef(null);
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // props 추가
  return (
    <MessageListContainer>
      {messages.map((message) => (
        <MessageItem key={message.id} sender={message.sender}>
          {/* 특별한 메시지 타입 처리 */}
          {message.type === "utilization-dashboard" ? (
            <UtilizationDashboard
              data={message.data}
              fileName={message.fileName}
              onCategorySelect={onCategorySelect}
            />
          ) : (
            <MessageText>
              <ReactMarkdown>{message.text}</ReactMarkdown>
            </MessageText>
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
`;

const MessageItem = styled.div`
  padding: ${(props) =>
    props.children?.props?.data ? "0" : "10px 15px"}; // 대시보드일 때 패딩 제거
  border-radius: 20px;
  max-width: ${(props) =>
    props.children?.props?.data ? "95%" : "70%"}; // 대시보드일 때 더 넓게
  word-wrap: break-word;
  white-space: pre-wrap;
  background-color: ${(props) => {
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
    /*background-color: #f7f9fc;
    border-left: 4px solid #0099ffff;
    border-radius: 0 8px 8px 0;
    color: #4a5568;*/
  }
`;


export default MessageList;
