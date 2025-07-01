import React, { useState } from 'react';
import styled from 'styled-components';
import MessageList from './components/MessageList';
import MessageForm from './components/MessageForm';
import axios from 'axios'; // axios import 확인

function App() {
    const [messages, setMessages] = useState([
        { id: 1, text: '안녕하세요! 무엇을 도와드릴까요?', sender: 'bot' }
    ]);
    const [inputValue, setInputValue] = useState('');

    const handleSendMessage = async (e) => { // async 키워드 추가
        e.preventDefault();
        const prompt = inputValue.trim();
        if (prompt === '') return;

        // 1. 사용자의 메시지를 화면에 먼저 표시
        const userMessage = {
            id: Date.now(), // 고유한 ID 생성을 위해 Date.now() 사용
            text: prompt,
            sender: 'user'
        };
        setMessages(prevMessages => [...prevMessages, userMessage]);
        setInputValue('');

        try {
            // 2. 백엔드로 프롬프트 전송 (POST 요청)
            const response = await axios.post('http://localhost:8080/api/prompt', {
                prompt: prompt // DTO의 필드 이름(prompt)과 일치해야 함
            });

            // 3. 백엔드의 응답을 받아 봇 메시지로 화면에 표시
            const botResponse = {
                id: Date.now() + 1,
                text: response.data, // Spring 서비스가 보낸 응답 메시지
                sender: 'bot'
            };
            setMessages(prevMessages => [...prevMessages, botResponse]);

        } catch (error) {
            console.error("Error sending prompt to backend:", error);
            const errorResponse = {
                id: Date.now() + 1,
                text: '백엔드와 통신 중 오류가 발생했습니다.',
                sender: 'bot'
            };
            setMessages(prevMessages => [...prevMessages, errorResponse]);
        }
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
