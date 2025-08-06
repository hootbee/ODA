import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import MessageList from "../components/MessageList";
import MessageForm from "../components/MessageForm";
import ContextSidebar from "../components/ContextSidebar";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

/* ---------------------------- 기본 메시지 --------------------------- */
const initialMessages = [
  { id: 1, text: "안녕하세요! 무엇을 도와드릴까요?", sender: "bot" },
  {
    id: 2,
    text: "저는 공공 데이터를 쉽게 찾고 활용할 수 있도록 돕는 AI 챗봇입니다.\n\n예) '부산시 주차장 데이터 보여줘'",
    sender: "bot",
  },
];

/* ============================ 컴포넌트 ============================= */
export default function ChatPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [contexts, setContexts] = useState([]);
  const [activeContextId, setActiveId] = useState(null);
  const [conversations, setConvs] = useState({});
  const [inputValue, setInput] = useState("");

  /* ---------------------- 유틸 ---------------------- */
  const authHeaders = () => {
    const t = localStorage.getItem("token");
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  /* -------------------- 새 대화 ---------------------- */
  const handleNewChat = useCallback(() => {
    const id = Date.now();
    setContexts((prev) => [...prev, { id, title: "새 대화" }]);
    setConvs((prev) => ({
      ...prev,
      [id]: {
        messages: initialMessages,
        sessionId: null,
        lastDataName: null,
      },
    }));
    setActiveId(id);
  }, []);

  

  /* ---------------- 히스토리 로드 ------------------- */
  const fetchHistory = useCallback(async () => {
    try {
      const { data: hist } = await axios.get(
        "http://localhost:8080/api/chat/history",
        { headers: authHeaders() }
      );

      if (!hist?.length) return handleNewChat();

      const ctxs = hist.map((h) => ({
        id: h.sessionId,
        title: h.sessionTitle,
      }));
      const convs = {};
      hist.forEach((h) => {
        const msgs = h.messages.map((m) => {
          let content;
          try {
            content = JSON.parse(m.content);
          } catch (e) {
            content = m.content;
          }
          return {
            id: `${m.sender}-${h.sessionId}-${m.createdAt}`,
            sender: m.sender.toLowerCase(),
            text: typeof content === 'string' ? content : JSON.stringify(content),
            ...(typeof content === 'object' && content !== null && content.success && content.data ? { type: 'utilization-dashboard', data: content.data, fileName: m.lastDataName } : {}),
          };
        });
        convs[h.sessionId] = {
          messages: msgs,
          sessionId: h.sessionId,
          lastDataName: h.lastDataName,
        };
      });

      setContexts(ctxs);
      setConvs(convs);
      setActiveId(ctxs[0].id);
    } catch (e) {
      console.error(e);
      handleNewChat();
    }
  }, [handleNewChat]);

  /* ---------------- useEffect ----------------------- */
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchHistory();
  }, [isAuthenticated, loading, navigate, fetchHistory]);

  /* ------------- 현재 대화 상태 ------------- */
  const conv = conversations[activeContextId] ?? {
    messages: [],
    sessionId: null,
    lastDataName: null,
  };

  /* ------------- 대화 업데이트 헬퍼 --------- */
  const updateConv = (updater) =>
    setConvs((prev) => {
      const cur = prev[activeContextId];
      const next = typeof updater === "function" ? updater(cur) : updater;
      return { ...prev, [activeContextId]: next };
    });

  /* ------------- 메시지 전송 --------------- */
  const handleSend = async (e, overridePrompt = null, overrideLast = null) => {
    e.preventDefault();
    const prompt = overridePrompt ?? inputValue.trim();
    if (!prompt) return;

    const userMsg = { id: Date.now(), sender: "user", text: prompt };
    updateConv((c) => ({ ...c, messages: [...c.messages, userMsg] }));
    setInput("");

    try {
      const body = {
        prompt,
        sessionId: conv.sessionId,
        lastDataName: overrideLast ?? conv.lastDataName,
      };
      const { data } = await axios.post(
        "http://localhost:8080/api/prompt",
        body,
        { headers: authHeaders() }
      );

      let botContent;
      try {
        botContent = JSON.parse(data.response);
      } catch (parseError) {
        botContent = data.response;
      }

      const botMessage = {
        id: Date.now() + 1,
        sender: "bot",
        text: typeof botContent === 'string' ? botContent : JSON.stringify(botContent),
        ...(typeof botContent === 'object' && botContent !== null && botContent.success && botContent.data ? { type: 'utilization-dashboard', data: botContent.data, fileName: data.lastDataName } : {}),
      };

      updateConv((c) => ({
        messages: [...c.messages, botMessage],
        sessionId: data.sessionId,
        lastDataName: data.lastDataName,
      }));

      /* 새 세션 제목 갱신 */
      if (conv.sessionId == null && data.sessionId) {
        setContexts((cs) =>
          cs.map((ctx) =>
            ctx.id === activeContextId
              ? { ...ctx, title: data.sessionTitle }
              : ctx
          )
        );
      }

      
    } catch (error) {
      console.error("Error sending message:", error);
      updateConv((c) => ({
        ...c,
        messages: [
          ...c.messages,
          {
            id: Date.now() + 1,
            sender: "bot",
            text: "백엔드 통신 오류가 발생했습니다.",
          },
        ],
      }));
    }
  };

  /* -------- 대시보드 카테고리 클릭 -------- */
  const onCategory = (cat, file) =>
    handleSend({ preventDefault() {} }, `${file} ${cat} 활용`, file);

  /* =================== 렌더 =================== */
  if (loading) return <div>Loading...</div>;

  return (
    <Container>
      <ContextSidebar
        contexts={contexts}
        activeContextId={activeContextId}
        onNewChat={handleNewChat}
        onSwitchContext={setActiveId}
      />
      <ChatPane>
        <MessageList messages={conv.messages} onCategorySelect={onCategory} />
        <MessageForm
          inputValue={inputValue}
          setInputValue={setInput}
          handleSendMessage={handleSend}
        />
      </ChatPane>
    </Container>
  );
}

/* ---------------- styled ----------------- */
const Container = styled.div`
  display: flex;
  height: 100vh;
  background: #f0f2f5;
  font-family: sans-serif;
`;
const ChatPane = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #ccc;
  background: #fff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;
