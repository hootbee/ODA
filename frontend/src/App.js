import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainPage from './pages/MainPage';
import ChatPage from './pages/ChatPage';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import ProfilePage from './pages/ProfilePage';
import Navbar from './components/Navbar';
import styled from 'styled-components';

const AppLayout = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  `;

const AppFooter = styled.footer`
  position: absolute;
  text-align: center;
  padding: 10px;
  font-size: 0.7rem;
  color: #868e96;
  background: transparent;
  z-index: 5;

  ${props => props.isChatPage ? `
    display: none;
    ` : `
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;`}
  `;

function App() {
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';

  return (
    <AuthProvider>
      <AppLayout>
        <Navbar />
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
        <AppFooter isChatPage={isChatPage}>
        본 서비스는 '서울 열린데이터 광장(https://data.seoul.go.kr/)'의 데이터를 활용하여 제공됩니다. 
        </AppFooter>
      </AppLayout>
    </AuthProvider>
  );
}
export default App;
