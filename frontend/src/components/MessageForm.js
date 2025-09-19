import React from 'react';
import styled from 'styled-components'; // styled-components import 추가
import { FiArrowUp } from "react-icons/fi";

function MessageForm({ inputValue, setInputValue, handleSendMessage }) {
    return (
        <MessageFormContainer onSubmit={handleSendMessage}>
            <MessageInput
                type="text"
                placeholder="메시지를 입력하세요..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
            />
            <SendButton type="submit">
                <FiArrowUp />
            </SendButton>
        </MessageFormContainer>
    );
}

// ============== Styled Components ==============

const MessageFormContainer = styled.form`
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e0ffeeff;
  background-color: #ffffff;
`;

const MessageInput = styled.input`
  flex-grow: 1;
  border: 1px solid #d1f0deff;
  border-radius: 50px;
  padding: 12px 20px;
  font-size: 16px;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #81ffb6ff;
    box-shadow: 0 0 0 2px rgba(59, 246, 146, 0.2);
  }
`;

const SendButton = styled.button`
  width: 44px;
  height: 44px;
  background-color: #0ae364ff;
  color: white;
  border: none;
  border-radius: 50%;
  margin-left: 10px;
  cursor: pointer;
  font-size: 23px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: #0dc660ff;
  }
`;

export default MessageForm;
