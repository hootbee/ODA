import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import MessageList from "../components/MessageList.js";
import MessageForm from "../components/MessageForm.js";
import ContextSidebar from "../components/ContextSidebar.js";
import axios from "axios";
import { useAuth } from "../context/AuthContext.js";
import { useNavigate } from "react-router-dom";

const initialMessages = [
  { id: 1, text: "안녕하세요! 무엇을 도와드릴까요?", sender: "bot" },
  {
    id: 2,
    text: "저는 공공 데이터를 쉽게 찾고 활용할 수 있도록 돕는 AI 챗봇입니다.\n\n예를 들어, '부산시 주차장 데이터 보여줘' 또는 '서울시 미세먼지 관련 데이터 찾아줘' 와 같이 질문해보세요.",
    sender: "bot",
  },
];

const ChatPage = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [contexts, setContexts] = useState([]);
  const [activeContextId, setActiveContextId] = useState(null);
  const [conversations, setConversations] = useState({});
  const [inputValue, setInputValue] = useState("");
  const [lastDataName, setLastDataName] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleNewChat = useCallback(() => {
    const newId = Date.now();
    const newContext = { id: newId, title: "새 대화" };
    setContexts(prev => [...prev, newContext]);
    setConversations(prev => ({ ...prev, [newId]: { messages: initialMessages, sessionId: null } }));
    setActiveContextId(newId);
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await axios.get("http://localhost:8080/api/chat/history", { headers: getAuthHeaders() });
      const history = response.data;

      if (history && history.length > 0) {
        const newContexts = history.map(h => ({ id: h.sessionId, title: h.sessionTitle }));
        const newConversations = {};
        history.forEach(h => {
          const formattedMessages = h.messages.flatMap((msg, index) => {
            const userMsg = { id: `user-${h.sessionId}-${index}`, text: msg.userMessage, sender: 'user' };
            let botMsg;
            try {
              const botResponseArray = JSON.parse(msg.botResponse);
              botMsg = { id: `bot-${h.sessionId}-${index}`, text: botResponseArray.join('\n'), sender: 'bot' };
            } catch (e) {
              botMsg = { id: `bot-${h.sessionId}-${index}`, text: msg.botResponse, sender: 'bot' };
            }
            return [userMsg, botMsg];
          });
          newConversations[h.sessionId] = { messages: formattedMessages, sessionId: h.sessionId };
        });

        setContexts(newContexts);
        setConversations(newConversations);
        setActiveContextId(newContexts[0].id);
      } else {
        handleNewChat();
      }
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
      handleNewChat();
    }
  }, [handleNewChat]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    } else if (!loading && isAuthenticated) {
      fetchHistory();
    }
  }, [isAuthenticated, loading, navigate, fetchHistory]);

  const activeConversation = conversations[activeContextId] || { messages: [], sessionId: null };
  const messages = activeConversation.messages;
  const sessionId = activeConversation.sessionId;

  const updateActiveConversation = (updater) => {
    setConversations(prev => {
        const currentConversation = prev[activeContextId];
        const updatedConversation = typeof updater === 'function' ? updater(currentConversation) : updater;
        return {
            ...prev,
            [activeContextId]: updatedConversation
        };
    });
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
        { dataInfo: { fileName }, analysisType: category },
        { headers: getAuthHeaders() }
      );

      const botMessage = {
        id: Date.now(),
        text: `🔍 ${getAnalysisTypeKorean(
          category
        )} 상세 분석:\n\n${response.data.join("\n\n")}`,
        sender: "bot",
      };
      updateActiveConversation(conv => ({ ...conv, messages: [...conv.messages, botMessage] }));
    } catch (error) {
      console.error("Error fetching category details:", error);
      const errorMessage = {
        id: Date.now(),
        text: `${getAnalysisTypeKorean(
          category
        )} 상세 정보를 가져오는 데 실패했습니다.`,
        sender: "bot",
      };
      updateActiveConversation(conv => ({ ...conv, messages: [...conv.messages, errorMessage] }));
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
    updateActiveConversation(conv => ({ ...conv, messages: [...conv.messages, userMessage] }));
    setInputValue("");

    if (lastDataName) {
      const isCsvRequest = ["CSV 조회", "csv", "실제 데이터"].some((keyword) => prompt.toLowerCase().includes(keyword.toLowerCase()));
      if (isCsvRequest) {
        const botMessage = { id: Date.now() + 1, text: `CSV 조회 기능은 현재 구현 중입니다: ${lastDataName}`, sender: "bot" };
        updateActiveConversation(conv => ({ ...conv, messages: [...conv.messages, botMessage] }));
        return;
      }

      const isFullUtilizationRequest = ["전체 활용", "모든 활용"].some((keyword) => prompt.includes(keyword));
      if (isFullUtilizationRequest) {
        try {
          const response = await axios.post(
            "http://localhost:8080/api/data-utilization/full",
            { dataInfo: { fileName: lastDataName }, analysisType: "all" },
            { headers: getAuthHeaders() }
          );
          const botMessage = {
            id: Date.now() + 1,
            text: "📊 전체 활용방안을 분석했습니다. 아래에서 관심 있는 분야를 선택해주세요.",
            sender: "bot",
            type: "utilization-dashboard",
            data: response.data,
            fileName: lastDataName,
          };
          updateActiveConversation(conv => ({ ...conv, messages: [...conv.messages, botMessage] }));
        } catch (error) {
          console.error("Error fetching full utilization data:", error);
          const errorMessage = { id: Date.now() + 1, text: "전체 활용방안을 가져오는 데 실패했습니다.", sender: "bot" };
          updateActiveConversation(conv => ({ ...conv, messages: [...conv.messages, errorMessage] }));
        }
        return;
      }
    }

    const isDetailRequest = prompt.includes("상세") || prompt.includes("자세히");
    if (isDetailRequest) {
      try {
        const response = await axios.post(
          "http://localhost:8080/api/data-details",
          { prompt: prompt },
          { headers: getAuthHeaders() }
        );
        const botMessage = { id: Date.now() + 1, text: response.data, sender: "bot" };
        const csvSuggestionMessage = {
          id: Date.now() + 2,
          text: `💡 더 자세한 분석을 원하신다면:\n\n• "CSV 조회" - 실제 데이터 접근하기 📋\n• "전체 활용" - 모든 활용방안 대시보드 🔍`,
          sender: "bot",
        };
        updateActiveConversation(conv => ({ ...conv, messages: [...conv.messages, botMessage, csvSuggestionMessage] }));
        const fileName = prompt.replace(/상세|자세히/g, "").trim();
        setLastDataName(fileName);
      } catch (error) {
        console.error("Error fetching data details:", error);
        const errorMessage = { id: Date.now() + 1, text: "상세 정보를 가져오는 데 실패했습니다.", sender: "bot" };
        updateActiveConversation(conv => ({ ...conv, messages: [...conv.messages, errorMessage] }));
      }
      return;
    }

    try {
      const response = await axios.post("http://localhost:8080/api/prompt", {
        prompt: prompt,
        sessionId: sessionId,
      }, { headers: getAuthHeaders() });

      const responseData = response.data;
      const botResponseText = Array.isArray(responseData.response)
        ? responseData.response.join("\n")
        : responseData.response;
      const botMessage = { id: Date.now() + 1, text: botResponseText, sender: "bot" };
      
      updateActiveConversation(conv => ({
        messages: [...conv.messages, botMessage],
        sessionId: responseData.sessionId
      }));

      if (sessionId === null && responseData.sessionId) {
        setContexts(prevContexts => 
          prevContexts.map(context => 
            context.id === activeContextId ? { ...context, title: responseData.sessionTitle } : context
          )
        );
      }
      setLastDataName(null);

    } catch (error) {
      console.error("Error sending prompt to backend:", error);
      const errorResponse = {
        id: Date.now() + 1,
        text: "백엔드와 통신 중 오류가 발생했습니다.",
        sender: "bot",
      };
      updateActiveConversation(conv => ({ ...conv, messages: [...conv.messages, errorResponse] }));
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

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
