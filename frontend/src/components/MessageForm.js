import React from 'react';
import styled from 'styled-components'; // styled-components import 추가
import { FiArrowUp } from "react-icons/fi";

const CommandSuggestions = ({ commands, onCommandSelect }) => (
  <SuggestionsContainer>
    <SuggestionHeader>명령어 목록</SuggestionHeader>
      {commands.map((cmd) => (
        <SuggestionItem key={cmd.command} onClick={() => onCommandSelect(cmd.command)}>
          <strong>{cmd.command}</strong>
          <span>{cmd.description}</span>
        </SuggestionItem>
      ))}
    </SuggestionsContainer>
  );

function MessageForm({ inputValue, setInputValue, handleSendMessage, showCommands, commands, onCommandSelect }) {
    return (
      <FormWrapper>
        {showCommands && commands.length > 0 && (
          <CommandSuggestions commands={commands} onCommandSelect={onCommandSelect} />
        )}
        <MessageFormContainer onSubmit={handleSendMessage}>
            <MessageInput
                type="text"
                placeholder="메시지를 입력하거나 /를 입력하세요..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
            />
            <SendButton type="submit">
                <FiArrowUp />
            </SendButton>
        </MessageFormContainer>
      </FormWrapper>
    );
}

// ============== Styled Components ==============

const FormWrapper = styled.div`
  position: relative;
`;

const SuggestionsContainer = styled.div`
  position: absolute;
  bottom: calc(100% + 10px);
  left: 1.5rem;
  right: 1.5rem;
  background-color: rgba(255, 255, 255, 0.85);
  border: 1px solid #e0e9ff;
  border-radius: 12px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
  z-index: 20;
  max-height: 180px;
  overflow-y: auto;
`;

const SuggestionHeader = styled.div`
    position: sticky;
    top: 0;
    padding: 8px 16px;
    background-color: rgba(255, 255, 255, 1);
    backdrop-filter: blur(8px);
    font-size: 0.8rem;
    font-weight: 500;
    color: #0073ffff;
    border-bottom: 1px solid #f0f2f5;
    z-inddex: 1;
`;

const SuggestionItem = styled.div`
    padding: 12px 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 12px;

    strong {
        font-weight: 500;
        color: #2c3e50;
    }

    span {
        font-size: 0.85rem;
        color: rgba(44, 62, 80, 0.7);
    }

    &:hover {
        background-color: rgba(222, 235, 255, 0.45);
    }
`;

const MessageFormContainer = styled.form`
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e0e9ff;
  background-color: #ffffff;
`;

const MessageInput = styled.input`
  flex-grow: 1;
  border: 1px solid #d1e0f0;
  border-radius: 50px;
  padding: 12px 20px;
  font-size: 16px;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #81cdffff;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
`;

const SendButton = styled.button`
  width: 44px;
  height: 44px;
  background-color: #0099ffff;
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
    background-color: #0066aaff;
  }
`;

export default MessageForm;
