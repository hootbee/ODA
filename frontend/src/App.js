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
  const [lastDataName, setLastDataName] = useState(null); // 마지막으로 조회한 데이터 파일명 저장

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

    // 1. 활용 방안 요청 확인
    const isUtilizationRequest = ["활용", "방안", "비즈니스", "연구", "정책"].some((keyword) =>
      prompt.includes(keyword)
    );

    if (lastDataName && isUtilizationRequest) {
      let analysisType = "";
      if (prompt.includes("비즈니스")) analysisType = "business";
      else if (prompt.includes("연구")) analysisType = "research";
      else if (prompt.includes("정책")) analysisType = "policy";

      if (analysisType) {
        try {
          const response = await axios.post(
            "http://localhost:8080/api/data-utilization/single",
            { dataInfo: { fileName: lastDataName }, analysisType } // 단일 API 호출
          );
          const botMessage = {
            id: Date.now() + 1,
            text: response.data.join("\n"), // 배열을 문자열로 변환
            sender: "bot",
          };
          setMessages((prevMessages) => [...prevMessages, botMessage]);
          setLastDataName(null); // 초기화
        } catch (error) {
          console.error("Error fetching single utilization data:", error);
          const errorMessage = {
            id: Date.now() + 1,
            text: "활용 방안을 가져오는 데 실패했습니다.",
            sender: "bot",
          };
          setMessages((prevMessages) => [...prevMessages, errorMessage]);
        }
      } else {
        const clarificationMessage = {
          id: Date.now() + 1,
          text: "어떤 측면의 활용 방안이 궁금하신가요? (비즈니스, 연구, 정책)",
          sender: "bot",
        };
        setMessages((prevMessages) => [...prevMessages, clarificationMessage]);
      }
      return;
    }

    // 2. 상세 정보 요청 확인 (키워드 기반)
    const isDetailRequest = prompt.includes("상세") || prompt.includes("자세히");

    if (isDetailRequest) {
      try {
        const response = await axios.post(
          "http://localhost:8080/api/data-details",
          { prompt: prompt }
        );
        const botMessage = {
          id: Date.now() + 1,
          text: response.data,
          sender: "bot",
        };
        const followUpMessage = {
          id: Date.now() + 2,
          text: "이 데이터에 대해 더 궁금한 점이 있으신가요? 어떤 측면의 활용 방안(비즈니스, 연구, 정책)이 궁금하신가요?",
          sender: "bot",
        };
        setMessages((prevMessages) => [
          ...prevMessages,
          botMessage,
          followUpMessage,
        ]);
        // 파일명을 추출하여 저장
        const fileName = prompt.replace(/상세|자세히/g, "").trim();
        setLastDataName(fileName);
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
      // 3. 일반 데이터 추천 요청
      try {
        const response = await axios.post("http://localhost:8080/api/prompt", {
          prompt: prompt,
        });

        const responseData = response.data;
        const botResponseText = Array.isArray(responseData)
          ? responseData.join("\n")
          : responseData;

        const botMessage = {
          id: Date.now() + 1,
          text: botResponseText,
          sender: "bot",
        };

        setMessages((prevMessages) => [...prevMessages, botMessage]);
        setLastDataName(null); // 상세 조회 아니므로 초기화
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
