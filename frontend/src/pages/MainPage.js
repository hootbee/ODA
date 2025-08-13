import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';

// 간단한 팝업 컴포넌트
const Popup = ({ handleClose }) => {
  return (
    <PopupOverlay>
      <PopupContainer>
        <h2>도움말</h2>
        <p>이것은 프로토타입 도움말 팝업입니다.</p>
        <p>챗봇 시작 버튼을 누르면 챗봇과 대화를 시작할 수 있습니다.</p>
        <CloseButton onClick={handleClose}>닫기</CloseButton>
      </PopupContainer>
    </PopupOverlay>
  );
};

const MainPage = () => {
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  const handleStartChat = () => {
    // App.js가 챗봇 메인 화면이라고 가정하고, App.js가 있는 기본 경로로 이동합니다.
    // 만약 챗봇 페이지가 별도의 경로(예: /chat)에 있다면 그에 맞게 수정해야 합니다.
    navigate('/chat');
  };

  const togglePopup = () => {
    setShowPopup(!showPopup);
  };

  const handleLogin = () => {
    alert('로그인 기능은 현재 준비 중입니다.');
  };

  return (
    <MainContainer>
      <RotatingLogo src={`${process.env.PUBLIC_URL}/ODA_logo.png`} alt="ODA Logo" />
      <Title>ODA 데이터 분석 챗봇</Title>
      <ButtonContainer>
        <Button onClick={handleStartChat}>챗봇 시작</Button>
        <Button onClick={togglePopup}>도움말</Button>
        <Button onClick={handleLogin}>로그인</Button>
      </ButtonContainer>
      {showPopup && <Popup handleClose={togglePopup} />}
    </MainContainer>
  );
};

export default MainPage;

const rotate = keyframes`
  from {
    transform: rotateY(0deg);
  }
  to {
    transform: rotateY(360deg);
  }
`;

// Styled Components
const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;
  perspective: 1000px;
`;

const RotatingLogo = styled.img`
  width: 350px;
  height: 350px;
  animation: ${rotate} 5s linear infinite;
`;

const Title = styled.h1`
  font-size: 3rem;
  color: #333;
  margin-bottom: 2rem;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1rem;
`;

const Button = styled.button`
  padding: 1rem 2rem;
  font-size: 1.2rem;
  color: #fff;
  background-color: #007bff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #0056b3;
  }
`;

const PopupOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
`;

const PopupContainer = styled.div`
  background-color: #fff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const CloseButton = styled.button`
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  font-size: 1rem;
  color: #fff;
  background-color: #6c757d;
  border: none;
  border-radius: 5px;
  cursor: pointer;

  &:hover {
    background-color: #5a6268;
  }
`;
