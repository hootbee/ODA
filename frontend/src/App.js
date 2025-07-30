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
  const [lastDataName, setLastDataName] = useState(null);

  // 대시보드 카테고리 클릭 처리
  const handleCategorySelect = async (category, fileName) => {
    try {
      const response = await axios.post(
        "http://localhost:8080/api/data-utilization/single", // ✅ 3001로 수정
        { dataInfo: { fileName }, analysisType: category }
      );

      const botMessage = {
        id: Date.now(),
        text: `🔍 ${getAnalysisTypeKorean(
          category
        )} 상세 분석:\n\n${response.data.join("\n\n")}`,
        sender: "bot",
      };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error("Error fetching category details:", error);
      const errorMessage = {
        id: Date.now(),
        text: `${getAnalysisTypeKorean(
          category
        )} 상세 정보를 가져오는 데 실패했습니다.`,
        sender: "bot",
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    }
  };

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

    // 전체 활용방안 요청 확인
    const isFullUtilizationRequest =
      ["전체 활용", "모든 활용", "활용방안 전체", "활용 전부"].some((keyword) =>
        prompt.includes(keyword)
      ) ||
      (lastDataName &&
        prompt.includes("활용") &&
        !["비즈니스", "연구", "정책"].some((k) => prompt.includes(k)));

    if (lastDataName && isFullUtilizationRequest) {
      try {
        const response = await axios.post(
          "http://localhost:8080/api/data-utilization/full", // ✅ 3001로 수정
          { dataInfo: { fileName: lastDataName }, analysisType: "all" }
        );

        const botMessage = {
          id: Date.now() + 1,
          text: "📊 전체 활용방안을 분석했습니다. 아래에서 관심 있는 분야를 선택해주세요.",
          sender: "bot",
          type: "utilization-dashboard",
          data: response.data,
          fileName: lastDataName,
        };
        setMessages((prevMessages) => [...prevMessages, botMessage]);
      } catch (error) {
        console.error("Error fetching full utilization data:", error);
        const errorMessage = {
          id: Date.now() + 1,
          text: "전체 활용방안을 가져오는 데 실패했습니다.",
          sender: "bot",
        };
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
      }
      return;
    }

    // 단일 활용방안 요청 확인
    const isUtilizationRequest = [
      "활용",
      "방안",
      "비즈니스",
      "연구",
      "정책",
    ].some((keyword) => prompt.includes(keyword));

    if (lastDataName && isUtilizationRequest) {
      let analysisType = "";
      if (prompt.includes("비즈니스")) analysisType = "business";
      else if (prompt.includes("연구")) analysisType = "research";
      else if (prompt.includes("정책")) analysisType = "policy";
      else if (prompt.includes("결합") || prompt.includes("조합"))
        analysisType = "combination";
      else if (prompt.includes("도구") || prompt.includes("분석"))
        analysisType = "tools";

      if (analysisType) {
        try {
          const response = await axios.post(
            "http://localhost:8080/api/data-utilization/single", // ✅ 3001로 수정
            { dataInfo: { fileName: lastDataName }, analysisType }
          );

          const botMessage = {
            id: Date.now() + 1,
            text: `🔍 ${getAnalysisTypeKorean(
              analysisType
            )} 상세 분석 결과:\n\n${response.data.join("\n\n")}`,
            sender: "bot",
          };
          setMessages((prevMessages) => [...prevMessages, botMessage]);
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
          text: `📋 어떤 측면의 활용 방안이 궁금하신가요?\n\n• "전체 활용" - 모든 분야 한눈에 보기\n• "비즈니스" - 수익 창출 방안\n• "연구" - 학술/기술 연구\n• "정책" - 공공 정책 활용\n• "결합" - 다른 데이터와 결합\n• "도구" - 분석 도구 추천`,
          sender: "bot",
        };
        setMessages((prevMessages) => [...prevMessages, clarificationMessage]);
      }
      return;
    }

    // 상세 정보 요청 확인
    const isDetailRequest =
      prompt.includes("상세") || prompt.includes("자세히");
    if (isDetailRequest) {
      try {
        const response = await axios.post(
          "http://localhost:8080/api/data-details", // ✅ 3001로 수정
          { prompt: prompt }
        );

        const botMessage = {
          id: Date.now() + 1,
          text: response.data,
          sender: "bot",
        };

        const followUpMessage = {
          id: Date.now() + 2,
          text: `💡 이 데이터에 대해 더 알고 싶으시다면:\n\n• "전체 활용" - 모든 활용방안 대시보드\n• "비즈니스 활용" - 수익 창출 아이디어\n• "연구 활용" - 학술 연구 방향\n• "정책 활용" - 공공 정책 제안`,
          sender: "bot",
        };

        setMessages((prevMessages) => [
          ...prevMessages,
          botMessage,
          followUpMessage,
        ]);

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
      return;
    }

    // 일반 데이터 추천 요청
    try {
      const response = await axios.post(
        "http://localhost:8080/api/prompt", // ✅ 3001로 수정
        { prompt: prompt }
      );

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
      setLastDataName(null);
    } catch (error) {
      console.error("Error sending prompt to backend:", error);
      const errorResponse = {
        id: Date.now() + 1,
        text: "백엔드와 통신 중 오류가 발생했습니다.",
        sender: "bot",
      };
      setMessages((prevMessages) => [...prevMessages, errorResponse]);
    }
  };

  const getAnalysisTypeKorean = (type) => {
    const typeMap = {
      business: "💼 비즈니스 활용방안",
      research: "🔬 연구 활용방안",
      policy: "🏛️ 정책 활용방안",
      combination: "🔗 데이터 결합 제안",
      tools: "🛠️ 분석 도구 추천",
    };
    return typeMap[type] || `${type} 분석`;
  };

  return (
    <AppContainer>
      <ChatWindow>
        <MessageList
          messages={messages}
          onCategorySelect={handleCategorySelect}
        />
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
