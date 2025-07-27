import React from 'react';
import styled from 'styled-components'; // styled-components import 추가

function MessageList({ messages }) {
    return (
        <MessageListContainer>
            {messages.map(message => (
                <MessageItem key={message.id} sender={message.sender}>
                    <span>{message.text}</span>
                </MessageItem>
            ))}
        </MessageListContainer>
    );
}

// ============== Styled Components ==============
// MessageList 컴포넌트에서만 사용하는 스타일들을 바로 아래에 정의합니다.

const MessageListContainer = styled.div`
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const MessageItem = styled.div`
  padding: 10px 15px;
  border-radius: 18px;
  max-width: 70%;
  word-wrap: break-word;
  white-space: pre-wrap; // 줄바꿈을 위한 스타일 추가
  background-color: ${props => (props.sender === 'user' ? '#007bff' : '#e9e9eb')};
  color: ${props => (props.sender === 'user' ? 'white' : 'black')};
  align-self: ${props => (props.sender === 'user' ? 'flex-end' : 'flex-start')};
`;

export default MessageList;
