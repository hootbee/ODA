import React, { useState, useEffect, useCallback, useRef } from "react";
import styled from "styled-components";
import MessageList from "../components/MessageList";
import MessageForm from "../components/MessageForm";
import ContextSidebar from "../components/ContextSidebar";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { GoTriangleUp, GoTriangleDown } from 'react-icons/go';

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
    console.log("Attempting to delete session with ID:", idToDelete);
    try {
      const isNewChat = typeof idToDelete === 'string' && idToDelete.startsWith('new-');

      // Step 1: If it's a saved chat, call the backend API to delete it.
      if (!isNewChat) {
        await axios.delete(`http://localhost:8080/api/chat/session/${idToDelete}`, {
          headers: authHeaders(),
        });
      }

      // Step 2: Update the local state to remove the chat.
      const newContexts = contexts.filter(ctx => ctx.id !== idToDelete);
      const newConvs = { ...conversations };
      delete newConvs[idToDelete];
      
      setContexts(newContexts);
      setConvs(newConvs);

      // Step 3: If the deleted chat was the active one, switch to another chat.
      if (activeContextId === idToDelete) {
        if (newContexts.length > 0) {
          // If there are other chats, make the first one active.
          setActiveId(newContexts[0].id);
        } else {
          // If no chats are left, create a new one.
          handleNewChat();
        }
      }
    } catch (error) {
      console.error("Error deleting chat session:", error);
      // Provide a more specific error message for backend errors.
      const errorMessage = error.response 
        ? `서버 오류: ${error.response.status} - ${error.response.data?.message || '알 수 없는 오류'}`
        : `채팅 삭제 중 오류가 발생했습니다: ${error.message}`;
      alert(errorMessage);
    }
  }, [activeContextId, contexts, conversations, authHeaders, handleNewChat, setActiveId, setConvs, setContexts]);

  

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
            // 서버에서 온 content는 문자열화된 JSON일 수 있습니다.
            content = JSON.parse(m.content);
          } catch (e) {
            content = m.content; // 파싱 실패 시 일반 문자열로 간주
          }

          const messageObject = {
            id: `${m.sender}-${h.sessionId}-${m.createdAt}`,
            sender: m.sender.toLowerCase(),
          };

          if (typeof content === 'object' && content !== null) {
            // 전체 활용 대시보드
            if (content.success && content.data) {
                messageObject.type = 'utilization-dashboard';
                messageObject.data = content.data;
                messageObject.fileName = m.lastDataName;
            // 단일/커스텀 활용 추천
            } else if (content.type === 'simple_recommendation') {
                messageObject.type = 'simple_recommendation';
                messageObject.recommendations = content.recommendations;
            // 데이터 상세 정보
            } else if (content.type === 'data_detail') {
                messageObject.type = 'data_detail';
                messageObject.text = content.detail;
                messageObject.fileName = content.fileName;
            // 기타 객체 또는 배열
            } else {
                messageObject.text = Array.isArray(content) ? content.join('\n') : JSON.stringify(content, null, 2);
            }
          } else {
            // 일반 문자열 응답
            messageObject.text = String(content);
          }
          
          return messageObject;
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
    setIsTyping(true);

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
      // Axios는 JSON 응답을 자동으로 파싱하므로 data.response는 이미 객체/배열입니다.
      if (typeof data.response === 'string') {
        // 하지만 서버가 문자열화된 JSON을 보냈을 경우를 대비해 파싱을 시도합니다.
        try {
          botContent = JSON.parse(data.response);
        } catch (e) {
          botContent = data.response; // 일반 문자열인 경우
        }
      } else {
        botContent = data.response; // 이미 파싱된 객체/배열인 경우
      }

      let botMessage;

      if (typeof botContent === 'object' && botContent !== null) {
        // 전체 활용 대시보드
        if (botContent.success && botContent.data) {
          botMessage = {
            id: Date.now() + 1,
            sender: 'bot',
            type: 'utilization-dashboard',
            data: botContent.data,
            fileName: data.lastDataName,
            text: ''
          };
        // 단일/커스텀 활용 추천
        } else if (botContent.type === 'simple_recommendation') {
          botMessage = {
            id: Date.now() + 1,
            sender: 'bot',
            type: 'simple_recommendation',
            recommendations: botContent.recommendations
          };
        // 데이터 상세 정보
        } else if (botContent.type === 'data_detail') {
          botMessage = {
            id: Date.now() + 1,
            sender: 'bot',
            type: 'data_detail',
            text: botContent.detail,
            fileName: botContent.fileName
          };
        // 기타 객체 또는 배열
        } else {
          botMessage = {
            id: Date.now() + 1,
            sender: 'bot',
            text: Array.isArray(botContent) ? botContent.join('\n') : JSON.stringify(botContent, null, 2)
          };
        }
      } else {
        // 일반 문자열 응답
        botMessage = {
          id: Date.now() + 1,
          sender: 'bot',
          text: String(botContent)
        };
      }

      updateConv((c) => ({
        messages: [...c.messages, botMessage],
        sessionId: data.sessionId,
        lastDataName: data.lastDataName,
      }));

      /* 새 세션 ID 및 제목 갱신 */
      if (conv.sessionId == null && data.sessionId) {
        const newId = data.sessionId;
        const oldId = activeContextId;

        // 1. 컨텍스트 목록의 ID를 실제 세션 ID로 업데이트
        setContexts((cs) =>
          cs.map((ctx) =>
            ctx.id === oldId
              ? { ...ctx, id: newId, title: data.sessionTitle }
              : ctx
          )
        );

        // 2. 대화 데이터의 키를 실제 세션 ID로 변경
        setConvs(prevConvs => {
            const newConvs = { ...prevConvs };
            newConvs[newId] = newConvs[oldId];
            delete newConvs[oldId];
            return newConvs;
        });

        // 3. 활성 ID를 실제 세션 ID로 변경
        setActiveId(newId);
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
    } finally {
      setIsTyping(false);
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
            <ScrollButton onClick={handleScrollToTop} title="맨 위로" visible={showScrollTop}>
                <GoTriangleUp />
            </ScrollButton>
            <ScrollButton onClick={scrollToBottom} title="맨 아래로" visible={showScrollBottom}>
                <GoTriangleDown />
            </ScrollButton>
        </ScrollControls>

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
  bottom: 110px; /* MessageForm 높이(약 80px) + 여유 공간(30px) */
  right: 40px;  /* ChatPane의 오른쪽 padding(1.5rem) 고려 */
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

  opacity: ${props => (props.visible ? 1 : 0)};
  visibility: ${props => (props.visible ? "visible" : "hidden")};
  transform: ${props => (props.visible ? "scale(1)" : "scale(0.5)")};

  &:hover {
    background-color: #0099ffff;
    color: white;
  }
`;
