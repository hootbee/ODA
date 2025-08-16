import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import UtilizationDashboard from "./UtilizationDashboard";
import ReactMarkdown from 'react-markdown';
import { GoTriangleUp, GoTriangleDown } from 'react-icons/go';

function MessageList({ messages, onCategorySelect, isTyping }) {
  const messageEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isAtTop = scrollTop < 50;
      const isAtBottom = scrollHeight - scrollTop < clientHeight + 50; 

      setShowScrollTop(!isAtTop);
      setShowScrollBottom(!isAtBottom);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
        handleScroll();
    }, 300);
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // props 추가
  return (
    <MessageListContainer ref={scrollContainerRef} onScroll={handleScroll}>
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

      <ScrollControls>
        <ScrollButton onClick={handleScrollToTop} title="맨 위로" visible={showScrollTop}>
          <GoTriangleUp />
        </ScrollButton>
        <ScrollButton onClick={scrollToBottom} title="맨 아래로" visible={showScrollBottom}>
          <GoTriangleDown />
        </ScrollButton>
      </ScrollControls>
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

const ScrollControls = styled.div`
  position: fixed;
  bottom: 100px;
  right: 40px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10;
`;

const ScrollButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid #e0e9ff;
  background-color: #ffffff;
  color: #4a5568;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  
  transition: all 0.2s ease;

  opacity: ${props => (props.visible ? 1 : 0)};
  visibility: ${props => (props.visible ? "visible" : "hidden")};
  transform: ${props => (props.visible ? "scale(1)" : "scale(0.5)")};

  &:hover {
  background-color: #0099ffff;
  color: white;
  }
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
    background-color: #f7f9fc;
    border-left: 4px solid #0099ffff;
    border-radius: 0 8px 8px 0;
    color: #4a5568;
  }
`;


export default MessageList;
