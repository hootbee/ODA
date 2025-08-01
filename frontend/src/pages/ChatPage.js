import React, { useState } from "react";
import styled from "styled-components";
import MessageList from "../components/MessageList.js";
import MessageForm from "../components/MessageForm.js";
import ContextSidebar from "../components/ContextSidebar.js";
import axios from "axios";

const initialMessages = [
  { id: 1, text: "안녕하세요! 무엇을 도와드릴까요?", sender: "bot" },
  {
    id: 2,
    text: "저는 공공 데이터를 쉽게 찾고 활용할 수 있도록 돕는 AI 챗봇입니다.\n\n예를 들어, '부산시 주차장 데이터 보여줘' 또는 '서울시 미세먼지 관련 데이터 찾아줘' 와 같이 질문해보세요.",
    sender: "bot",
  },
];

const ChatPage = () => {
  const [contexts, setContexts] = useState([{ id: 1, title: "새 대화" }]);
  const [activeContextId, setActiveContextId] = useState(1);
  const [conversations, setConversations] = useState({ 1: initialMessages });
  const [inputValue, setInputValue] = useState("");
  const [lastDataName, setLastDataName] = useState(null);

  const messages = conversations[activeContextId] || [];

  const setMessages = (updater) => {
    setConversations(prev => ({
      ...prev,
      [activeContextId]: typeof updater === 'function' ? updater(prev[activeContextId]) : updater,
    }));
  };

  const handleNewChat = () => {
    if (contexts.length < 3) {
      const newId = Date.now();
      const newContext = { id: newId, title: `새 대화 ${contexts.length + 1}` };
      setContexts([...contexts, newContext]);
      setConversations({ ...conversations, [newId]: initialMessages });
      setActiveContextId(newId);
    } else {
      alert("최대 3개의 대화만 생성할 수 있습니다.");
    }
  };

  const switchContext = (id) => {
    setActiveContextId(id);
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

  const handleCategorySelect = async (category, fileName) => {
    try {
      const response = await axios.post(
        "http://localhost:8080/api/data-utilization/single",
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

    // --- 후속 조치 확인 ---
    if (lastDataName) {
      const isCsvRequest = [
        "CSV 조회",
        "csv",
        "실제 데이터",
        "데이터 조회",
        "원본 데이터",
      ].some((keyword) => prompt.toLowerCase().includes(keyword.toLowerCase()));

      if (isCsvRequest) {
        try {
          const loadingMessage = {
            id: Date.now() + 1,
            text: "📊 공공데이터 포털에서 실제 데이터를 가져오고 있습니다...",
            sender: "bot",
          };
          setMessages((prevMessages) => [...prevMessages, loadingMessage]);

          const response = await axios.post(
            "http://localhost:8080/api/data-access/real",
            { fileName: lastDataName }
          );

          const csvMessage = {
            id: Date.now() + 2,
            text: "✅ 실제 데이터를 성공적으로 가져왔습니다!",
            sender: "bot",
            type: "csv-viewer",
            data: response.data,
            fileName: lastDataName,
          };

          setMessages((prevMessages) => [
            ...prevMessages.slice(0, -1),
            csvMessage,
          ]);
        } catch (error) {
          console.error("Error fetching CSV data:", error);
          const errorMessage = {
            id: Date.now() + 2,
            text: "❌ 실제 데이터를 가져오는 데 실패했습니다. 공공데이터 포털 접근 문제일 수 있습니다.",
            sender: "bot",
          };
          setMessages((prevMessages) => [
            ...prevMessages.slice(0, -1),
            errorMessage,
          ]);
        }
        return;
      }

      const isFullUtilizationRequest = [
        "전체 활용",
        "모든 활용",
        "활용방안 전체",
        "활용 전부",
      ].some((keyword) => prompt.includes(keyword));

      if (isFullUtilizationRequest) {
        try {
          const response = await axios.post(
            "http://localhost:8080/api/data-utilization/full",
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

      const isUtilizationRequest = ["활용", "방안"].some((keyword) =>
        prompt.includes(keyword)
      );

      if (isUtilizationRequest) {
        try {
          const response = await axios.post(
            "http://localhost:8080/api/data-utilization/single",
            { dataInfo: { fileName: lastDataName }, analysisType: prompt }
          );

          const botMessage = {
            id: Date.now() + 1,
            text: `🔍 사용자 맞춤 활용 방안에 대한 분석 결과입니다:\n\n${response.data.join(
              "\n\n"
            )}`,
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
        return;
      }
    }

    // --- 새로운 검색 또는 상세 정보 요청 ---
    const isDetailRequest =
      prompt.includes("상세") || prompt.includes("자세히");
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

        const csvSuggestionMessage = {
          id: Date.now() + 2,
          text: `💡 더 자세한 분석을 원하신다면:\n\n📊 **해당 CSV를 조회하시겠어요?**\n공공데이터 포털에서 실제 데이터를 가져와서 구체적인 분석이 가능합니다.\n\n• "CSV 조회" - 실제 데이터 접근하기 📋\n• "전체 활용" - 모든 활용방안 대시보드 🔍\n• "비즈니스 활용" - 수익 창출 아이디어 💼\n• "연구 활용" - 학술 연구 방향 🔬\n• "정책 활용" - 공공 정책 제안 🏛️\n\n💬 또는, "이 데이터를 우리 동네 마케팅에 어떻게 활용할 수 있을까?" 와 같이 자유롭게 질문해보세요!`,
          sender: "bot",
        };

        setMessages((prevMessages) => [
          ...prevMessages,
          botMessage,
          csvSuggestionMessage,
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

    // --- 일반 프롬프트 처리 ---
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
      setLastDataName(null); // 새로운 검색 후에는 컨텍스트 초기화
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

  return (
    <AppContainer>
      <ContextSidebar
        contexts={contexts}
        activeContextId={activeContextId}
        onNewChat={handleNewChat}
        onSwitchContext={switchContext}
      />
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
};

const AppContainer = styled.div`
  display: flex;
  height: 100vh;
  background-color: #f0f2f5;
  font-family: sans-serif;
`;

const ChatWindow = styled.div`
  flex: 1;
  height: 100%;
  border-left: 1px solid #ccc;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;

export default ChatPage;