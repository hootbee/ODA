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
  border-top: 1px solid #ffe0ecff;
  background-color: #ffffff;
`;

const MessageInput = styled.input`
  flex-grow: 1;
  border: 1px solid #f0d1d9ff;
  border-radius: 50px;
  padding: 12px 20px;
  font-size: 16px;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #ff81afff;
    box-shadow: 0 0 0 2px rgba(246, 59, 125, 0.2);
  }
`;

const SendButton = styled.button`
  width: 44px;
  height: 44px;
  background-color: #f63b83ff;
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
    background-color: #cd1d63ff;
  }
`;

export default MessageForm;
