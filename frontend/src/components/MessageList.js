import React from "react";
import styled, { css, keyframes } from "styled-components";
import ReactMarkdown from "react-markdown";
import { FaUser } from "react-icons/fa";

// Message Type Components
import UtilizationDashboard from "./UtilizationDashboard";
import DataDetailView from "./messages/DataDetailView";
import SearchResults from "./messages/SearchResults";
import SearchNotFound from "./messages/SearchNotFound";
import SimpleRecommendation from "./messages/SimpleRecommendation";
import HelpMessage from "./messages/HelpMessage";
import ContextResetMessage from "./messages/ContextResetMessage";
import ErrorMessage from "./messages/ErrorMessage";
import DataAnalysisResult from "./messages/DataAnalysisResult";

// A simple component to render normal text messages
const TextMessage = ({ content }) => (
  <MessageText>
    <ReactMarkdown>{content || ""}</ReactMarkdown>
  </MessageText>
);

// hint/tip
const TipMessage = ({ children }) => (
  <StyledTipMessage>{children}</StyledTipMessage>
);

const MessageBody = ({ message, onCategorySelect }) => {
  switch (message.type) {
    case "search_results":
      return <SearchResults data={message.data} />;
    case "search_not_found":
      return <SearchNotFound data={message.data} />;
    case "context_reset":
      return <ContextResetMessage />;
    case "utilization-dashboard":
      return (
        <UtilizationDashboard
          data={message.data}
          fileName={message.fileName}
          onCategorySelect={onCategorySelect} // ★ 전달
        />
      );
    case "data_detail":
      return (
        <>
          <DataDetailView data={message.data} />
          <TipMessage>
            💡 '데이터 확인'을 입력하면 데이터 다운로드 및 분석 후 결과를
            알려드립니다. 분석이 끝나면 데이터는 삭제됩니다.
            <br />
            <strong>예시:</strong> "데이터 확인", "전체 활용", "비즈니스 활용"
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
            💡 다른 데이터 조회를 원하시면 '다른 데이터 활용'을 입력하세요.
          </TipMessage>
        </>
      );
    case "data_analysis":
      return (
        <>
          <DataAnalysisResult data={message.data} />
          <TipMessage>
            📊 분석이 완료되었습니다. 예: "이 데이터로 사업 아이템 추천"
          </TipMessage>
        </>
      );
    default:
      return <TextMessage content={message.text} />;
  }
};

function MessageList({
  messages,
  isTyping,
  scrollContainerRef,
  messageEndRef,
  onScroll,
  onCategorySelect, // ★ 받기
}) {
  return (
    <MessageListContainer ref={scrollContainerRef} onScroll={onScroll}>
      {messages.map((message, index) => {
        const prevMessage = messages[index - 1];
        const nextMessage = messages[index + 1];
        const isFirst = !prevMessage || prevMessage.sender !== message.sender;
        const isLast = !nextMessage || nextMessage.sender !== message.sender;

        return (
          <MessageRow
            key={message.id}
            sender={message.sender}
            isFirst={isFirst}
          >
            {isFirst ? (
              <Avatar sender={message.sender}>
                {message.sender === "user" ? (
                  <FaUser />
                ) : (
                  <img
                    src={`${process.env.PUBLIC_URL}/ODA_logo.png`}
                    alt="Bot Avatar"
                  />
                )}
              </Avatar>
            ) : (
              <AvatarPlaceholder />
            )}

            <MessageItem
              sender={message.sender}
              type={message.type}
              isFirst={isFirst}
              isLast={isLast}
            >
              <MessageBody
                message={message}
                onCategorySelect={onCategorySelect}
              />
            </MessageItem>
          </MessageRow>
        );
      })}

      {isTyping && (
        <MessageRow sender="bot" isFirst={true}>
          <Avatar sender="bot">
            <img src={`${process.env.PUBLIC_URL}/ODA_logo.png`} alt="Bot" />
          </Avatar>
          <MessageItem sender="bot" isFirst={true} isLast={true}>
            <TypingIndicator>
              <Spinner />
              <span>입력 중...</span>
            </TypingIndicator>
          </MessageItem>
        </MessageRow>
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

const MessageRow = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: ${(props) =>
    props.sender === "user" ? "flex-end" : "flex-start"};
  margin-top: ${(props) => (props.isFirst ? "15px" : "5px")};
`;

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${(props) =>
    props.sender === "user" ? "#0099ffff" : "#ffffff"};
  color: ${(props) => (props.sender === "user" ? "white" : "#4b5563")};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  margin: 0 10px;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.05);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  ${(props) =>
    props.sender === "user" &&
    css`
      order: 2;
    `}
`;

const AvatarPlaceholder = styled.div`
  width: 60px;
  flex-shrink: 0;
  ${(props) =>
    props.sender === "user" &&
    css`
      order: 2;
    `}
`;

const MessageItem = styled.div`
  padding: ${(props) =>
    [
      "search_results",
      "search_not_found",
      "context_reset",
      "data_detail",
      "help",
      "utilization-dashboard",
    ].includes(props.type)
      ? "0"
      : "10px 15px"};
  border-radius: 20px;
  max-width: ${(props) =>
    [
      "search_results",
      "search_not_found",
      "context_reset",
      "data_detail",
      "help",
      "utilization-dashboard",
    ].includes(props.type)
      ? "95%"
      : "70%"};
  word-wrap: break-word;
  white-space: pre-wrap;
  background-color: ${(props) => {
    if (
      [
        "search_results",
        "search_not_found",
        "context_reset",
        "data_detail",
        "help",
        "utilization-dashboard",
      ].includes(props.type)
    )
      return "transparent";
    return props.sender === "user" ? "#0099ffff" : "#e9e9eb";
  }};
  color: ${(props) => (props.sender === "user" ? "white" : "black")};
  align-self: ${(props) =>
    props.sender === "user" ? "flex-end" : "flex-start"};
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
