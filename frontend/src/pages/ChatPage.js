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

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleNewChat = useCallback(() => {
    const newId = Date.now();
    const newContext = { id: newId, title: "새 대화" };
    setContexts((prev) => [...prev, newContext]);
    setConversations((prev) => ({
      ...prev,
      [newId]: { messages: initialMessages, sessionId: null },
    }));
    setActiveContextId(newId);
  }, []);

  const parseBotResponse = useCallback((responseData) => {
    try {
      const data = responseData.response; // Access the 'response' field from ChatResponseDto
      const fileName = responseData.lastDataName; // Access the 'lastDataName' field

      if (data && data.success && data.data) {
        // 전체 활용방안 (대시보드)
        return {
          type: "utilization-dashboard",
          data: data.data,
          fileName: fileName,
        };
      } else if (data && data.text) {
        // 상세 정보
        return { type: "text", text: data.text };
      } else if (Array.isArray(data)) {
        // 일반 검색 결과
        return { type: "text", text: data.join("\n") };
      }
    } catch (e) {
      /* 파싱 실패 시 일반 텍스트로 처리 */
    }
    return { type: "text", text: JSON.stringify(responseData) }; // Fallback to stringify the whole response if parsing fails
  }, []);

  /* ---------- useCallback ---------- */
  const fetchHistory = useCallback(async () => {
    try {
      const { data: history } = await axios.get(
        "http://localhost:8080/api/chat/history",
        { headers: getAuthHeaders() }
      );

      if (history?.length) {
        const newContexts = history.map((h) => ({
          id: h.sessionId,
          title: h.sessionTitle,
        }));

        const newConversations = {};
        history.forEach((h) => {
          const formatted = h.messages.flatMap((msg, idx) => {
            const user = {
              id: `user-${h.sessionId}-${idx}`,
              text: msg.userMessage,
              sender: "user",
            };
            const bot = {
              id: `bot-${h.sessionId}-${idx}`,
              sender: "bot",
              ...parseBotResponse({
                response: JSON.parse(msg.botResponse),
                lastDataName: msg.lastDataName,
              }),
            };
            return [user, bot];
          });
          newConversations[h.sessionId] = {
            messages: formatted,
            sessionId: h.sessionId,
          };
        });

        setContexts(newContexts);
        setConversations(newConversations);
        setActiveContextId(newContexts[0].id);
      } else {
        handleNewChat();
      }
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
      handleNewChat();
    }
  }, [handleNewChat, parseBotResponse]); // ← 의존성 배열

  /* ---------- useEffect ---------- */
  useEffect(() => {
    if (loading) return; // 아직 auth 체크 중

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    fetchHistory(); // 로그인 돼 있으면 히스토리 로드
  }, [isAuthenticated, loading, navigate, fetchHistory]);

  const activeConversation = conversations[activeContextId] || {
    messages: [],
    sessionId: null,
  };
  const messages = activeConversation.messages;
  const sessionId = activeConversation.sessionId;

  const updateActiveConversation = (updater) => {
    setConversations((prev) => {
      const currentConversation = prev[activeContextId];
      const updatedConversation =
        typeof updater === "function" ? updater(currentConversation) : updater;
      return { ...prev, [activeContextId]: updatedConversation };
    });
  };

  const switchContext = (id) => {
    setActiveContextId(id);
  };

  const handleSendMessage = async (e, overridePrompt = null) => {
    e.preventDefault();
    const prompt = overridePrompt !== null ? overridePrompt : inputValue.trim();
    if (prompt === "") return;

    const userMessage = { id: Date.now(), text: prompt, sender: "user" };
    updateActiveConversation((conv) => ({
      ...conv,
      messages: [...conv.messages, userMessage],
    }));
    setInputValue("");

    try {
      const response = await axios.post(
        "http://localhost:8080/api/prompt",
        {
          prompt: prompt,
          sessionId: sessionId,
        },
        { headers: getAuthHeaders() }
      );

      const responseData = response.data;
      const botResponseContent = parseBotResponse(responseData);
      const botMessage = {
        id: Date.now() + 1,
        sender: "bot",
        ...botResponseContent,
      };

      updateActiveConversation((conv) => ({
        messages: [...conv.messages, botMessage],
        sessionId: responseData.sessionId,
      }));

      if (sessionId === null && responseData.sessionId) {
        setContexts((prevContexts) =>
          prevContexts.map((context) =>
            context.id === activeContextId
              ? { ...context, title: responseData.sessionTitle }
              : context
          )
        );
      }

      if (prompt.includes("상세") || prompt.includes("자세히")) {
        const suggestionMessage = {
          id: Date.now() + 2,
          text: `💡 더 자세한 분석을 원하신다면:\n\n• "전체 활용" - 모든 활용방안 대시보드 🔍`,
          sender: "bot",
        };
        updateActiveConversation((conv) => ({
          ...conv,
          messages: [...conv.messages, suggestionMessage],
        }));
      }
    } catch (error) {
      console.error("Error sending prompt to backend:", error);
      const errorResponse = {
        id: Date.now() + 1,
        text: "백엔드와 통신 중 오류가 발생했습니다.",
        sender: "bot",
      };
      updateActiveConversation((conv) => ({
        ...conv,
        messages: [...conv.messages, errorResponse],
      }));
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const handleDashboardCategorySelect = async (category, fileName) => {
    const prompt = `${fileName} ${category} 활용`;
    await handleSendMessage({ preventDefault: () => {} }, prompt);
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
          onCategorySelect={handleDashboardCategorySelect}
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
