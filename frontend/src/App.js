import React from 'react';
import { Routes, Route } from 'react-router-dom';
import styled from 'styled-components';
import MainPage from './pages/MainPage';
import ChatComponent from './components/ChatComponent'; // 기존 App.js 내용을 옮길 컴포넌트

function App() {
  return (
    <Routes>
      <Route path="/" element={<ChatComponent />} />
      <Route path="/main" element={<MainPage />} />
    </Routes>
  );
}

export default App;
