import React, { useState, useEffect, useCallback, useRef } from "react";
import styled from "styled-components";
import MessageList from "../components/MessageList";
import MessageForm from "../components/MessageForm";
import ContextSidebar from "../components/ContextSidebar";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { GoTriangleUp, GoTriangleDown } from "react-icons/go";
import { parseBotMessage } from "../utils/messageParser";

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
  const [isTyping, setIsTyping] = useState(false);

  const scrollContainerRef = useRef(null);
  const messageEndRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const isAtTop = scrollTop < 50;
    const isAtBottom = scrollHeight - scrollTop < clientHeight + 50;
    setShowScrollTop(!isAtTop);
    setShowScrollBottom(!isAtBottom);
  };

  useEffect(() => {
    const timer = setTimeout(() => handleScroll(), 300);
    return () => clearTimeout(timer);
  }, [conversations[activeContextId]?.messages]);

  const updateConv = (updater) =>
    setConvs((prev) => {
      const cur = prev[activeContextId];
      const next = typeof updater === "function" ? updater(cur) : updater;
      return { ...prev, [activeContextId]: next };
    });

  /* ---------------------- 유틸 ---------------------- */
  const authHeaders = () => {
    const t = localStorage.getItem("token");
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  /* -------------------- 새 대화 ---------------------- */
  const handleNewChat = useCallback(() => {
    const id = `new-${Date.now()}`;
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

  /* -------------------- 대화 삭제 -------------------- */
  const handleDeleteContext = useCallback(async (idToDelete) => {
    try {
      const isNewChat = typeof idToDelete === 'string' && idToDelete.startsWith('new-');
      if (!isNewChat) {
        await axios.delete(`http://localhost:8080/api/chat/session/${idToDelete}`, { headers: authHeaders() });
      }
      const newContexts = contexts.filter(ctx => ctx.id !== idToDelete);
      const newConvs = { ...conversations };
      delete newConvs[idToDelete];
      setContexts(newContexts);
      setConvs(newConvs);
      if (activeContextId === idToDelete) {
        if (newContexts.length > 0) {
          setActiveId(newContexts[0].id);
        } else {
          handleNewChat();
        }
      }
    } catch (error) {
      console.error("Error deleting chat session:", error);
      alert(`채팅 삭제 중 오류 발생: ${error.message}`);
    }
  }, [activeContextId, contexts, conversations, handleNewChat]);

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
        convs[h.sessionId] = {
          messages: h.messages.map((m) => {
            let content;
            try {
              content = JSON.parse(m.content);
            } catch (e) {
              content = m.content;
            }
            // parseBotMessage 유틸리티 함수 사용
            return parseBotMessage(content, {
              id: `${m.sender}-${h.sessionId}-${m.createdAt}`,
              lastDataName: h.lastDataName,
            });
          }),
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

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) navigate("/login");
    else fetchHistory();
  }, [isAuthenticated, loading, navigate, fetchHistory]);

  const conv = conversations[activeContextId] ?? {
    messages: [],
    sessionId: null,
    lastDataName: null,
  };

  useEffect(() => {
    scrollToBottom();
  }, [conv.messages]);

  const handleSend = async (e, overridePrompt = null, overrideLast = null) => {
    e.preventDefault();
    const prompt = overridePrompt ?? inputValue.trim();
    if (!prompt) return;

    const userMsg = { id: Date.now(), sender: "user", text: prompt };
    updateConv((c) => ({ ...c, messages: [...c.messages, userMsg] }));
    setInput("");
    setIsTyping(true);

    try {
      const { data } = await axios.post(
        "http://localhost:8080/api/prompt",
        {
          prompt,
          sessionId: conv.sessionId,
          lastDataName: overrideLast ?? conv.lastDataName,
        },
        { headers: authHeaders() }
      );

      let botContent;
      try {
        botContent = JSON.parse(data.response);
      } catch (e) {
        botContent = data.response;
      }

      // parseBotMessage 유틸리티 함수 사용
      const botMessage = parseBotMessage(botContent, {
        lastDataName: data.lastDataName,
      });

      updateConv((c) => ({
        messages: [...c.messages, botMessage],
        sessionId: data.sessionId,
        lastDataName: data.lastDataName,
      }));

      if (conv.sessionId == null && data.sessionId) {
        const newId = data.sessionId;
        const oldId = activeContextId;
        setContexts((cs) =>
          cs.map((ctx) =>
            ctx.id === oldId
              ? { ...ctx, id: newId, title: data.sessionTitle }
              : ctx
          )
        );
        setConvs((prevConvs) => {
          const newConvs = { ...prevConvs };
          newConvs[newId] = newConvs[oldId];
          delete newConvs[oldId];
          return newConvs;
        });
        setActiveId(newId);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMsg = parseBotMessage({
        type: "error",
        message: "백엔드 통신 오류가 발생했습니다.",
      });
      updateConv((c) => ({ ...c, messages: [...c.messages, errorMsg] }));
    } finally {
      setIsTyping(false);
    }
  };

  const onCategory = (cat, file) =>
    handleSend({ preventDefault() {} }, `${file} ${cat} 활용`, file);

  if (loading) return <div>Loading...</div>;

  return (
    <Container>
      <ContextSidebar
        contexts={contexts}
        activeContextId={activeContextId}
        onNewChat={handleNewChat}
        onSwitchContext={setActiveId}
        onDeleteContext={handleDeleteContext}
      />
      <ChatPane>
        <ChatWrapper>
          <MessageList
            messages={conv.messages}
            onCategorySelect={onCategory}
            isTyping={isTyping}
            scrollContainerRef={scrollContainerRef}
            messageEndRef={messageEndRef}
            onScroll={handleScroll}
          />
          <MessageForm
            inputValue={inputValue}
            setInputValue={setInput}
            handleSendMessage={handleSend}
          />
        </ChatWrapper>
        <ScrollControls>
          <ScrollButton
            onClick={handleScrollToTop}
            title="맨 위로"
            visible={showScrollTop}
          >
            <GoTriangleUp />
          </ScrollButton>
          <ScrollButton
            onClick={scrollToBottom}
            title="맨 아래로"
            visible={showScrollBottom}
          >
            <GoTriangleDown />
          </ScrollButton>
        </ScrollControls>
      </ChatPane>
    </Container>
  );
}

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
  padding: 1.9rem 0 0 0;
  overflow: hidden;
  height: 100%;
  border-left: 1px solid #ccc;
  background: #fff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  position: relative;
`;

const ChatWrapper = styled.div`
  width: 100%;
  height: 100%;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ScrollControls = styled.div`
  position: absolute;
  bottom: 110px;
  right: 40px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10;
`;

const ScrollButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid #e0e9ff;
  background-color: #ffffff;
  color: #4a5568;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  transition: all 0.2s ease;

  opacity: ${(props) => (props.visible ? 1 : 0)};
  visibility: ${(props) => (props.visible ? "visible" : "hidden")};
  transform: ${(props) => (props.visible ? "scale(1)" : "scale(0.5)")};

  &:hover {
    background-color: #0099ffff;
    color: white;
  }
`;
