import React from 'react';
import styled from 'styled-components'; // styled-components import 추가

function MessageForm({ inputValue, setInputValue, handleSendMessage }) {
    return (
        <MessageFormContainer onSubmit={handleSendMessage}>
            <MessageInput
                type="text"
                placeholder="메시지를 입력하세요..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
            />
            <SendButton type="submit">전송</SendButton>
        </MessageFormContainer>
    );
}

// ============== Styled Components ==============

const MessageFormContainer = styled.form`
  display: flex;
  padding: 10px;
  border-top: 1px solid #ccc;
`;

const MessageInput = styled.input`
  flex-grow: 1;
  border: 1px solid #ccc;
  border-radius: 18px;
  padding: 10px 15px;
  font-size: 16px;
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const SendButton = styled.button`
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 18px;
  padding: 10px 20px;
  margin-left: 10px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
  &:hover {
    background-color: #0056b3;
  }
`;

export default MessageForm;
