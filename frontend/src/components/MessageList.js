import React from "react";
import styled from "styled-components";
import UtilizationDashboard from "./UtilizationDashboard"; // 새로 추가

function MessageList({ messages, onCategorySelect }) {
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
              {message.text.split("\n").map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </MessageText>
          )}
        </MessageItem>
      ))}
    </MessageListContainer>
  );
}

// ============== Styled Components ==============

const MessageListContainer = styled.div`
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const MessageItem = styled.div`
  padding: ${(props) =>
    props.children?.props?.data ? "0" : "10px 15px"}; // 대시보드일 때 패딩 제거
  border-radius: 18px;
  max-width: ${(props) =>
    props.children?.props?.data ? "95%" : "70%"}; // 대시보드일 때 더 넓게
  word-wrap: break-word;
  white-space: pre-wrap;
  background-color: ${(props) => {
    // 대시보드 메시지는 투명 배경
    if (props.children?.props?.data) return "transparent";
    return props.sender === "user" ? "#007bff" : "#e9e9eb";
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

const MessageText = styled.span`
  display: block;
  line-height: 1.4;
`;

export default MessageList;
