import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import ChatPage from './pages/ChatPage'; // 경로 및 이름 변경

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />      {/* 기본 경로를 MainPage로 */}
      <Route path="/chat" element={<ChatPage />} />  {/* /chat 경로를 ChatPage로 */}
    </Routes>
  );
}

export default App;
