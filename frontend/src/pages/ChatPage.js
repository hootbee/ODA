import React, { useState, useEffect } from "react";
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

  const [contexts, setContexts] = useState([{ id: 1, title: "새 대화" }]);
  const [activeContextId, setActiveContextId] = useState(1);
  const [conversations, setConversations] = useState({
    1: { messages: initialMessages, sessionId: null }
  });
  const [inputValue, setInputValue] = useState("");
  const [lastDataName, setLastDataName] = useState(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, loading, navigate]);

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

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleNewChat = () => {
    if (contexts.length < 3) {
      const newId = Date.now();
      const newContext = { id: newId, title: `새 대화 ${contexts.length + 1}` };
      setContexts([...contexts, newContext]);
      setConversations({ ...conversations, [newId]: { messages: initialMessages, sessionId: null } });
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

    // --- 일반 프롬프트 처리 ---
    try {
      const response = await axios.post("http://localhost:8080/api/prompt", {
        prompt: prompt,
        sessionId: sessionId, // 세션 ID 추가
      }, { headers: getAuthHeaders() });

      const responseData = response.data; // { response: [...], sessionId: ... }
      const botResponseText = Array.isArray(responseData.response)
        ? responseData.response.join("\n")
        : responseData.response;

      const botMessage = {
        id: Date.now() + 1,
        text: botResponseText,
        sender: "bot",
      };
      
      updateActiveConversation(conv => ({
        messages: [...conv.messages, botMessage],
        sessionId: responseData.sessionId // 세션 ID 업데이트
      }));

      // 방금 새로운 세션이 생성된 경우, 사이드바의 제목을 백엔드에서 받은 제목으로 업데이트합니다.
      if (sessionId === null && responseData.sessionId) {
        setContexts(prevContexts => 
          prevContexts.map(context => 
            context.id === activeContextId ? { ...context, title: responseData.sessionTitle } : context
          )
        );
      }

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