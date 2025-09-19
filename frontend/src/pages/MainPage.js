import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { FaInfoCircle, FaQuestionCircle, FaTerminal, FaTimes } from 'react-icons/fa';

// 간단한 팝업 컴포넌트
const Popup = ({ handleClose }) => {
  return (
    <PopupOverlay>
      <PopupContainer>
        <PopupHeader>
          <h2>도움말</h2>
          <CloseButton onClick={handleClose}>
            <FaTimes />
          </CloseButton>
        </PopupHeader>
        <PopupContent>
          <Section>
            <SectionTitle>
              <FaInfoCircle /> 프로그램 소개
            </SectionTitle>
            <p>
              JDK는 Jeonbuk Data Knower의 약자로, 전라북도 내 공공 데이터를 찾고 분석 및
              활용하는 것을 돕는 AI 챗봇입니다.
            </p>
          </Section>
          <Section>
            <SectionTitle>
              <FaQuestionCircle /> 기본 사용법
            </SectionTitle>
            <OrderedList>
              <li>
                원하는 공공 데이터를 질문해보세요. (예: "전주시 교통 데이터 보여줘")
              </li>
              <li>
                챗봇이 찾아준 데이터의 '[파일명] 자세히' 또는 '[파일명] 상세정보'를 요청하여 데이터를 더 깊게 확인할 수 있습니다.
              </li>
              <li>
                '전체 활용' 또는 '비즈니스 활용'으로 특정 파일에 대한 활용 방안을 요청할 수 있습니다.
              </li>
              <li>
                해외 사례와 연관된 활용 방안 혹은 더욱 세부적인 사항도 요청할 수 있습니다.
              </li>
            </OrderedList>
          </Section>
          <Section>
            <SectionTitle>
              <FaTerminal /> 주요 명령어
            </SectionTitle>
            <p>
              아래와 같은 키워드를 포함하여 질문하면 더 정확한 답변을 얻을 수 있습니다.
            </p>
            <CommandList>
              <li>
                <code>[지역명] [데이터명] 데이터 보여줘</code> - 데이터 검색
              </li>
              <li>
                <code>[파일명] 자세히</code>, <code>[파일명] 상세정보</code> - 데이터의 상세 정보 확인
              </li>
              <li>
                <code>데이터 확인</code> - 데이터 미리보기, 다운로드, 분석
              </li>
              <li>
                <code>전체 활용</code>, <code>비즈니스 활용</code> - 데이터 활용 방안 확인
              </li>
              <li>
                <code>다른 데이터 조회</code> - 새로운 데이터 검색 시작
              </li>
            </CommandList>
          </Section>
        </PopupContent>
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
      <FloatingBubble_Q1 top="20%" left="15%" delay="-2s">어떤 도움이 필요하신가요?</FloatingBubble_Q1>
      <FloatingBubble_A1 top="35%" left="10%" delay="0s">전주의 데이터 3개를 찾고 있어</FloatingBubble_A1>
      <FloatingBubble_Q2 top="50%" left="65%" delay="-2s">이 데이터에 대한 자세한 정보가 필요하신가요?</FloatingBubble_Q2>
      <FloatingBubble_A2 top="65%" left="73%" delay="0s">이 데이터의 활용 방안을 알려줘</FloatingBubble_A2>
      <ContentWrapper>
        <RotatingLogo src={`${process.env.PUBLIC_URL}/JDK_logo2.png`} alt="JDK Logo" />
        <Title>JDK<br/>Data Analysis Chatbot</Title>
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
  background: linear-gradient(150deg, #f4fffaff 0%, #a0ffd7ff 100%);
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
  color: #2c5046ff;
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
  background: rgba(18, 255, 109, 0.62);
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1;
  font-size: 1.2rem;
  color: #2c5046ff;
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
  color: #2c5046ff;
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
  background: rgba(18, 255, 109, 0.62);
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1;
  font-size: 1.2rem;
  color: #2c5046ff;
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
  color: #2c5046ff;
  text-align: center;
  margin-bottom: 5rem;
  line-height: 1.3;
  background: linear-gradient(45deg, #0d6e51ff 30%, #0ad871ff 70%);
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
  color: #0d6e41ff;
  background-color: rgba(255, 255, 255, 0.2);
  border: 3px solid #5cffa8ff;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    color: #ffffffff;
    background-color: #0ae364ff;
    border-color: #0ae364ff;
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(33, 255, 151, 0.3);
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
  z-index: 10;
`;

const PopupContainer = styled.div`
  background-color: #fff;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const PopupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  height: 60px;
  border-bottom: 1px solid #e9efedff;
  flex-shrink: 0;
  box-sizing: border-box;

  h2 {
    margin: 0;
    font-size: 1.2rem;
    color: #2c5040ff;
  }
`;

const CloseButton = styled.button`
  width: 32px;
  height: 32px;

  background: none;
  border: none;
  font-size: 1.5rem;
  color: #869690ff;
  cursor: pointer;
  padding: 5px;
  line-height: 1;
  transition: color 0.2s;

  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #2c5040ff;
  }
`;

const PopupContent = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  text-align: left;
  color: #495753ff;

  p {
    line-height: 1.6;
    margin: 0.5rem 0 0 0;
  }
`;

const Section = styled.section`
  margin-bottom: 2rem;
  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.1rem;
  color: #345e50ff;
  margin: 0 0 1rem 0;
`;

const OrderedList = styled.ol`
  padding-left: 20px;
  line-height: 1.7;
  
  li {
    margin-bottom: 0.5rem;
  }
`;

const CommandList = styled.ul`
    list-style: none;
    padding: 0;

    li {
        margin-bottom: 0.5rem;
    }

    code {
        display: inline-block;
        background-color: #ddfff3ff;
        color: #00c25eff;
        padding: 4px 8px;
        border-radius: 5px;
        font-size: 0.95em;
    }
`;
