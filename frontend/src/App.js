import React, { useState } from 'react';
import styled from 'styled-components'; // styled-components import 추가
import MessageList from './components/MessageList';
import MessageForm from './components/MessageForm';

function App() {
    const [messages, setMessages] = useState([
        { id: 1, text: '안녕하세요! 무엇을 도와드릴까요?', sender: 'bot' }
    ]);
    const [inputValue, setInputValue] = useState('');

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (inputValue.trim() === '') return;

        const userMessage = {
            id: messages.length + 1,
            text: inputValue,
            sender: 'user'
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInputValue('');

        setTimeout(() => {
            const botResponse = {
                id: updatedMessages.length + 1,
                text: `"${inputValue}"에 대해 찾아볼게요!`,
                sender: 'bot'
            };
            setMessages(prev => [...prev, botResponse]);
        }, 1000);
    };

    return (
        <AppContainer>
            <ChatWindow>
                <MessageList messages={messages} />
                <MessageForm
                    inputValue={inputValue}
                    setInputValue={setInputValue}
                    handleSendMessage={handleSendMessage}
                />
            </ChatWindow>
        </AppContainer>
    );
}

// ============== Styled Components ==============

const AppContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;
  font-family: sans-serif;
`;

const ChatWindow = styled.div`
  width: 400px;
  height: 600px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;

export default App;
