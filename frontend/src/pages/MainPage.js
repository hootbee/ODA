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

  /*const handleLogin = () => {
    alert('로그인 기능은 현재 준비 중입니다.');
  };*/

  return (
    <MainContainer>
      <FloatingBubble_Q1 top="20%" left="15%" delay="-2s">어떤 데이터 분석을 도와드릴까요?</FloatingBubble_Q1>
      <FloatingBubble_A1 top="35%" left="10%" delay="0s">밥 먹는 시간을 분석해줘</FloatingBubble_A1>
      <FloatingBubble_Q2 top="50%" left="75%" delay="-2s">어떤 도움이 필요하신가요?</FloatingBubble_Q2>
      <FloatingBubble_A2 top="65%" left="77%" delay="0s">이 데이터의 활용 방안을 알려줘</FloatingBubble_A2>
      <ContentWrapper>
        <RotatingLogo src={`${process.env.PUBLIC_URL}/ODA_logo.png`} alt="ODA Logo" />
        <Title>ODA<br/>Data Analysis Chatbot</Title>
        <ButtonContainer>
          <Button onClick={handleStartChat}>Chat</Button>
          <Button onClick={togglePopup}>Help</Button>
          {/*<Button onClick={handleLogin}>로그인</Button>*/}
        </ButtonContainer>
      </ContentWrapper>
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

//채팅 버블
const float = keyframes`
  0% {
    transform: translateY(0px) rotateX(5deg) rotateY(-10deg);
  }
  50% {
    transform: translateY(-20px) rotateX(5deg) rotateY(10deg);
  }
  100% {
    transform: translateY(0px) rotateX(5deg) rotateY(-10deg);
  }
`;

// Styled Components
const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(150deg, #f4f8ff 0%, #a1ceffff 100%);
  perspective: 1000px;
  font-family: 'Poppins', sans-serif;
  position: relative;
  overflow: hidden;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 2;
`;

const FloatingBubble_Q1 = styled.div`
  position: absolute;
  top: ${props => props.top};
  left: ${props => props.left};
  right: ${props => props.right};
  padding: 1.2rem 1.7rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1;
  font-size: 1.2rem;
  color: #2c3e50;
  font-weight: 500;

  animation: ${float} 6s ease-in-out infinite;
  animation-delay: ${props => props.delay};
`;

const FloatingBubble_A1 = styled.div`
  position: absolute;
  top: ${props => props.top};
  left: ${props => props.left};
  right: ${props => props.right};
  padding: 1.2rem 1.7rem;
  background: rgba(46, 161, 255, 0.62);
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1;
  font-size: 1.2rem;
  color: #2c3e50;
  font-weight: 500;

  animation: ${float} 6s ease-in-out infinite;
  animation-delay: ${props => props.delay};
`;

const FloatingBubble_Q2 = styled.div`
  position: absolute;
  top: ${props => props.top};
  left: ${props => props.left};
  right: ${props => props.right};
  padding: 1.2rem 1.7rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1;
  font-size: 1.2rem;
  color: #2c3e50;
  font-weight: 500;

  animation: ${float} 6s ease-in-out infinite;
  animation-delay: ${props => props.delay};
`;

const FloatingBubble_A2 = styled.div`
  position: absolute;
  top: ${props => props.top};
  left: ${props => props.left};
  right: ${props => props.right};
  padding: 1.2rem 1.7rem;
  background: rgba(46, 161, 255, 0.62);
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1;
  font-size: 1.2rem;
  color: #2c3e50;
  font-weight: 500;

  animation: ${float} 6s ease-in-out infinite;
  animation-delay: ${props => props.delay};
`;

const RotatingLogo = styled.img`
  width: 350px;
  height: 350px;
  animation: ${rotate} 5s linear infinite;
`;

const Title = styled.h1`
  font-size: 3rem;
  font-weight: 700;
  color: #2c3e50;
  text-align: center;
  margin-bottom: 5rem;
  line-height: 1.3;
  background: linear-gradient(45deg, #0d326e 30%, #1d8bd5ff 70%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 1.5rem;
`;

const Button = styled.button`
  min-width: 180px;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-family: 'Poppins', sans-serif;
  font-weight: 600;
  color: #0d326e;
  background-color: rgba(255, 255, 255, 0.2);
  border: 3px solid #8bbcffff;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    color: #fff;
    background-color: #0086dfff;
    border-color: #0086dfff;
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(33, 166, 255, 0.3);
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
