import React, { useState } from "react";
import styled from "styled-components";
import MessageList from "./components/MessageList";
import MessageForm from "./components/MessageForm";
import axios from "axios";

function App() {
  const [messages, setMessages] = useState([
    { id: 1, text: "안녕하세요! 무엇을 도와드릴까요?", sender: "bot" },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [lastBotResponse, setLastBotResponse] = useState(null);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const prompt = inputValue.trim();
    if (prompt === "") return;

    const userMessage = {
      id: Date.now(),
      text: prompt,
      sender: "user",
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue("");

    // 사용자가 이전에 제안된 데이터에 대해 질문하는지 확인
    if (lastBotResponse && lastBotResponse.includes(prompt)) {
      try {
        const response = await axios.get(
          `http://localhost:8080/api/data/${prompt}`
        );
        const data = response.data;
        let detailsText = `**${prompt} 상세 정보**\n`;
        for (const [key, value] of Object.entries(data)) {
          if (value) {
            detailsText += `* **${key}**: ${value}\n`;
          }
        }

        const botMessage = {
          id: Date.now() + 1,
          text: detailsText,
          sender: "bot",
        };
        setMessages((prevMessages) => [...prevMessages, botMessage]);
        setLastBotResponse(null);
      } catch (error) {
        console.error("Error fetching data details:", error);
        const errorMessage = {
          id: Date.now() + 1,
          text: "상세 정보를 가져오는 데 실패했습니다.",
          sender: "bot",
        };
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
      }
    } else {
      // 일반적인 프롬프트 처리
      try {
        const response = await axios.post("http://localhost:8080/api/prompt", {
          prompt: prompt,
        });

        const responseData = response.data;
        const isDataArray =
          Array.isArray(responseData) && responseData.length > 0;
        const botResponseText = isDataArray
          ? responseData.join("\n")
          : responseData;

        const botMessage = {
          id: Date.now() + 1,
          text: botResponseText,
          sender: "bot",
        };

        // ⭐ 수정된 부분: 조건에 따라 메시지 추가 방식 분리
        if (isDataArray) {
          const followUpMessage = {
            id: Date.now() + 2,
            text: "더 자세히 보고싶은 데이터가 있나요?",
            sender: "bot",
          };
          // 한 번에 두 메시지 모두 추가
          setMessages((prevMessages) => [
            ...prevMessages,
            botMessage,
            followUpMessage,
          ]);
          setLastBotResponse(responseData);
        } else {
          // 봇 메시지만 추가
          setMessages((prevMessages) => [...prevMessages, botMessage]);
          setLastBotResponse(null);
        }
      } catch (error) {
        console.error("Error sending prompt to backend:", error);
        const errorResponse = {
          id: Date.now() + 1,
          text: "백엔드와 통신 중 오류가 발생했습니다.",
          sender: "bot",
        };
        setMessages((prevMessages) => [...prevMessages, errorResponse]);
      }
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

// ============== Styled Components ===============

const AppContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;
  font-family: sans-serif;
`;

const ChatWindow = styled.div`
  width: 800px;
  height: 800px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;

export default App;
