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
import { FaDatabase, FaTimes } from "react-icons/fa";

/* ---------------------------- 기본 메시지 --------------------------- */
const initialMessages = [
  { id: 1, text: "안녕하세요! 무엇을 도와드릴까요?", sender: "bot" },
  {
    id: 2,
    text: "저는 공공 데이터를 쉽게 찾고 활용할 수 있도록 돕는 AI 챗봇입니다.\n\n예) '부산시 주차장 데이터 보여줘'",
    sender: "bot",
  },
];

const availableCommands = [
  {
    command: "/도움말",
    description: "현재 지원되는 모든 명령어와 그에 맞는 사용 예시를 제공합니다.",
  },
  {
    command: "자세히 [파일명]",
    description: "선택된 데이터의 메타 데이터를 제공합니다.",
  },
  {
    command: "/데이터 확인",
    description: "현재 선택된 데이터를 분석 및 다운로드 할 수 있도록 도와줍니다.",
  },
  {
    command: "/종합 활용",
    description: "선택된 데이터를 바탕으로 4개의 카테고리 활용 방안을 제공합니다.",
  },
  {
    command: "/활용 [원하는 방식/목적]",
    description: "선택된 데이터와 이전 AI 응답을 바탕으로 특정 방식이나 목적에 맞는 활용 방안을 제공합니다.",
  },
  {
    command: "/다른 데이터",
    description: "다른 공공 데이터셋을 선택할 수 있도록 도와줍니다.",
  },
  {
    command: "/포털사이트",
    description: "공공 데이터 포털 사이트로 이동할 수 있는 링크를 제공합니다.",
  },
  {
    command: "/오픈API",
    description: "선택된 데이터의 오픈API 링크를 제공합니다.",
  }
];

/* ---------------------- 안전 파서 유틸 ---------------------- */
const safeParseIfJson = (x) => {
  if (typeof x !== "string") return x;
  try {
    return JSON.parse(x);
  } catch {
    return x;
  }
};

export default function ChatPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [contexts, setContexts] = useState([]);
  const [activeContextId, setActiveId] = useState(null);
  const [conversations, setConvs] = useState({});
  const [inputValue, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState(availableCommands);

  const scrollContainerRef = useRef(null);
  const messageEndRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
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

  const authHeaders = () => {
    const t = localStorage.getItem("token");
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

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

  const handleDeleteContext = useCallback(
    async (idToDelete) => {
      try {
        const isNewChat =
          typeof idToDelete === "string" && idToDelete.startsWith("new-");
        if (!isNewChat) {
          await axios.delete(
            `http://localhost:8080/api/chat/session/${idToDelete}`,
            { headers: authHeaders() }
          );
        }
        const newContexts = contexts.filter((ctx) => ctx.id !== idToDelete);
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
    },
    [activeContextId, contexts, conversations, handleNewChat]
  );

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
            const id = `${m.sender}-${h.sessionId}-${m.createdAt}`;
            if (m.sender && m.sender.toLowerCase() === "user") {
              return { id, sender: "user", text: m.content };
            }
            const content = safeParseIfJson(m.content);
            return parseBotMessage(content, {
              id,
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
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      fetchHistory();
    }
  }, [isAuthenticated, loading, navigate, fetchHistory]);

  const conv = conversations[activeContextId] ?? {
    messages: [],
    sessionId: null,
    lastDataName: null,
  };

  useEffect(() => {
    scrollToBottom();
  }, [conv.messages]);

  const handleContextReset = () => {
    updateConv((currentConversation) => ({
      ...currentConversation,
      lastDataName: null,
    }));
    const resetMessage = {
      id: Date.now(),
      sender: "bot",
      type: "context_reset",
    };
    updateConv((c) => ({ ...c, messages: [...c.messages, resetMessage] }));
  };

  const handleInputChange = (value) => {
  setInput(value);
  if (value.startsWith("/")) {
    setShowCommands(true);
    if (value == "/") {
      setFilteredCommands(availableCommands);
    } else {
      setFilteredCommands(
        availableCommands.filter((c) => c.command.startsWith(value))
      );
    }
  } else {
    setShowCommands(false);
    }
  };

const handleCommandSelect = (command) => {
  setInput(command);
  setShowCommands(false);
};

  const handleSend = async (e, overridePrompt = null, overrideLast = null) => {
    e.preventDefault();
    setShowCommands(false);
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

      const botContent = safeParseIfJson(data.response);
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
          const nc = { ...prevConvs };
          nc[newId] = nc[oldId];
          delete nc[oldId];
          return nc;
        });
        setActiveId(newId);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMsg = parseBotMessage({
        type: "error",
        message:
          "백엔드 통신 중 오류가 발생했습니다. 서버 로그를 확인해주세요.",
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
          <DataChoiceHeader visible={!!conv.lastDataName}>
            <HeaderContent>
              <FaDatabase />
              <span>{conv.lastDataName}</span>
            </HeaderContent>
            <ResetButton
              onClick={handleContextReset}
              title="데이터 선택 초기화"
            >
              <FaTimes />
            </ResetButton>
          </DataChoiceHeader>

          <MessageList
            messages={conv.messages}
            onCategorySelect={onCategory} // ★ 전달!
            isTyping={isTyping}
            scrollContainerRef={scrollContainerRef}
            messageEndRef={messageEndRef}
            onScroll={handleScroll}
          />

          <MessageForm
            inputValue={inputValue}
            setInputValue={handleInputChange}
            handleSendMessage={handleSend}
            showCommands={showCommands}
            commands={filteredCommands}
            onCommandSelect={handleCommandSelect}
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
};

/* -------------------------- styled-components -------------------------- */

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
  overflow: hidden;
  height: 100%;
  padding: 0;
  box-sizing: border-box;
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
  position: relative;
`;

const DataChoiceHeader = styled.div`
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: auto;
  min-width: 300px;
  max-width: 60%;
  padding: 8px 8px 8px 16px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 50px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  z-index: 10;
  transition: all 0.4s ease-in-out;

  opacity: ${(p) => (p.visible ? 1 : 0)};
  visibility: ${(p) => (p.visible ? "visible" : "hidden")};
  transform: ${(p) =>
    p.visible ? "translate(-50%, 0)" : "translate(-50%, -20px)"};
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #2c3e50;
  font-weight: 500;
  font-size: 0.9rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const ResetButton = styled.button`
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #868e96;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  margin-left: 10px;

  &:hover {
    background: rgba(0, 0, 0, 0.1);
    color: #2c3e50;
  }
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

  opacity: ${(p) => (p.visible ? 1 : 0)};
  visibility: ${(p) => (p.visible ? "visible" : "hidden")};
  transform: ${(p) => (p.visible ? "scale(1)" : "scale(0.5)")};

  &:hover {
    background-color: #0099ffff;
    color: white;
  }
`;
