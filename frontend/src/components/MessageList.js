import React from "react";
import styled, { keyframes } from "styled-components";
import ReactMarkdown from 'react-markdown';

// Message Type Components
import UtilizationDashboard from "./UtilizationDashboard";
import DataDetailView from "./messages/DataDetailView";
import SearchResults from "./messages/SearchResults";
import SearchNotFound from "./messages/SearchNotFound";
import SimpleRecommendation from "./messages/SimpleRecommendation";
import HelpMessage from "./messages/HelpMessage";
import ContextResetMessage from "./messages/ContextResetMessage";
import ErrorMessage from "./messages/ErrorMessage";

// A simple component to render normal text messages
const TextMessage = ({ content }) => (
    <MessageText>
        <ReactMarkdown>{content || ''}</ReactMarkdown>
    </MessageText>
);

// A component to render the hint/tip below a message
const TipMessage = ({ children }) => (
    <StyledTipMessage>{children}</StyledTipMessage>
);

// This component acts as a router to render the correct message body based on its type.
const MessageBody = ({ message }) => {
    switch (message.type) {
        case "search_results":
            return <SearchResults data={message.data} />;
        case "search_not_found":
            return <SearchNotFound data={message.data} />;
        case "context_reset":
            return <ContextResetMessage />;
        case "utilization-dashboard":
            return <UtilizationDashboard data={message.data} fileName={message.fileName} />;
        case "data_detail":
            return (
                <>
                    <DataDetailView data={message.data} />
                    <TipMessage>
                        💡 이 데이터를 어떻게 활용하고 싶으신가요? 자유롭게 질문해주세요!<br />
                        <strong>예시:</strong> "전체 활용", "비즈니스 활용" 등
                    </TipMessage>
                </>
            );
        case "help":
            return <HelpMessage />;
        case "error":
            return <ErrorMessage>{message.text}</ErrorMessage>;
        case "simple_recommendation":
            return (
                <>
                    <SimpleRecommendation recommendations={message.recommendations} />
                    <TipMessage>
                        💡 다른 데이터 조회를 원하시면 '다른 데이터 활용'을 입력하시고, 다른 활용방안을 원하시면 프롬프트를 작성해주세요.
                    </TipMessage>
                </>
            );
        default:
            return <TextMessage content={message.text} />;
    }
};

function MessageList({ messages, isTyping, scrollContainerRef, messageEndRef, onScroll }) {
  return (
    <MessageListContainer ref={scrollContainerRef} onScroll={onScroll}>
      {messages.map((message) => (
        <MessageItem key={message.id} sender={message.sender} type={message.type}>
          <MessageBody message={message} />
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

export default MessageList;

// ============== Styled Components ==============

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
    // Render messages with custom components without padding
    ['search_results', 'search_not_found', 'context_reset', 'data_detail', 'help', 'utilization-dashboard'].includes(props.type) ? "0" : "10px 15px"};
  border-radius: 20px;
  max-width: ${(props) =>
    ['search_results', 'search_not_found', 'context_reset', 'data_detail', 'help', 'utilization-dashboard'].includes(props.type) ? "95%" : "70%"};
  word-wrap: break-word;
  white-space: pre-wrap;
  background-color: ${(props) => {
    if (['search_results', 'search_not_found', 'context_reset', 'data_detail', 'help', 'utilization-dashboard'].includes(props.type)) return `transparent`;
    return props.sender === "user" ? "#0099ffff" : "#e9e9eb";
  }};
  color: ${(props) => (props.sender === "user" ? "white" : "black")};
  align-self: ${(props) =>
    props.sender === "user" ? "flex-end" : "flex-start"};
`;

const MessageText = styled.div`
  line-height: 1.5;
  text-align: left;
  p { margin: 0; }
  strong { font-weight: 600; color: #000000ff; }
  h3 { font-size: 1.2em; margin: 0; padding-bottom: 10px; border-bottom: 1px solid #bcbcbcff; }
  hr { display: none; }
  p > strong { margin-right: 3px; }
  ul { padding-left: 20px; margin: 0; }
  li { margin-bottom: 0px; }
  blockquote { margin: 0; padding: 0 15px; background-color: #f7f9fc; border-left: 4px solid #0099ffff; border-radius: 0 8px 8px 0; color: #4a5568; }
`;

const StyledTipMessage = styled.div`
  margin-top: 12px;
  padding: 10px 15px;
  background-color: #f0f7ff;
  border-radius: 15px;
  font-size: 0.9em;
  color: #4a5568;
  line-height: 1.5;
  text-align: left;
`;