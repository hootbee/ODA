import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styled from "styled-components";
import { FaInfoCircle, FaQuestionCircle, FaTerminal, FaTimes } from 'react-icons/fa';

const Popup = ({ handleClose }) => {
  return (
    <PopupOverlay>
      <PopupContainer>
        <PopupHeader>
          <h2>도움말</h2>
          <CloseButton onClick={handleClose}><FaTimes /></CloseButton>
        </PopupHeader>
        <PopupContent>
          <Section>
            <SectionTitle><FaInfoCircle /> 프로그램 소개</SectionTitle>
            <p>
              ODA는 Open Data Agent의 약자로, 공공 데이터를 찾고 분석 및 활용하는 것을 돕는 AI 챗봇입니다.
            </p>
          </Section>
          
          <Section>
            <SectionTitle><FaQuestionCircle /> 기본 사용법</SectionTitle>
            <OrderedList>
              <li>원하는 공공 데이터를 질문해보세요. (예: "서울시 교통 데이터 보여줘")</li>
              <li>챗봇이 찾아준 데이터의 '[파일명] 자세히' 또는 '[파일명] 상세정보'를 요청하여 데이터를 더 깊게 확인할 수 있습니다.</li>
              <li>'전체 활용' 또는 '비즈니스 활용'으로 특정 파일에 대한 활용 방안을 요청할 수 있습니다.</li>
              <li>해외 사례와 연관된 활용 방안 혹은 더욱 세부적인 사항도 요청할 수 있습니다.</li>
            </OrderedList>
          </Section>

          <Section>
            <SectionTitle><FaTerminal /> 주요 명령어</SectionTitle>
            <p>아래와 같은 키워드를 포함하여 질문하면 더 정확한 답변을 얻을 수 있습니다.</p>
            <CommandList>
              <li><code>[지역명] [데이터명] 데이터 보여줘</code> - 데이터 검색</li>
              <li><code>데이터 확인</code> - 데이터 미리보기, 다운로드, 분석</li>
              <li><code>[파일명] 자세히</code>, <code>[파일명] 상세정보</code> - 데이터의 상세 정보 확인</li>
              <li><code>전체 활용</code>, <code>비즈니스 활용</code> - 데이터 활용 방안 확인</li>
              <li><code>다른 데이터 조회</code> - 새로운 데이터 검색 시작</li>
            </CommandList>
          </Section>
        </PopupContent>
      </PopupContainer>
    </PopupOverlay>
  );
};

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const togglePopup = () => setShowPopup(!showPopup);

  return (
    <>
      <Nav>
        <NavLinks>
          <NavLink to="/"><LogoImage src={`${process.env.PUBLIC_URL}/ODA_logo.png`} alt="ODA Logo" /></NavLink>
          <StyledLink to="/chat">Chat</StyledLink>
          <HelpButton onClick={togglePopup}>Help</HelpButton>
          <StyledLink to="/profile">Profile</StyledLink>
      </NavLinks>
      <AuthControls>
        {isAuthenticated ? (
          <>
            <WelcomeText>환영합니다, {user.name}님!</WelcomeText>
            <LogoutButton onClick={logout}>로그아웃</LogoutButton>
          </>
        ) : (
          <StyledLink to="/login">로그인</StyledLink>
        )}
      </AuthControls>
    </Nav>
    {showPopup && <Popup handleClose={togglePopup} />}
    </>
  );
};

const Nav = styled.nav`
  padding: 0 2rem;
  height: 60px;
  background: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 10;
`;

const NavLinks = styled.div`
    display: flex;
    align-items: center;
`;

const LogoImage = styled.img`
  height: 55px;
  margin-right: 1rem;
  vertical-align: middle;
`;

const AuthControls = styled.div`
    display: flex;
    align-items: center;
`;

const StyledLink = styled(NavLink)`
  color: #333;
  text-decoration: none;
  padding: 1rem;
  transition: color 0.2s;
  font-weight: 500;
  font-family: 'Poppins', sans-serif;

  &:hover {
    color: #0099ffff;
  }

  &.active {
    color: #0099ffff;
    font-weight: 700;
  }
`;

const WelcomeText = styled.span`
    margin-right: 1rem;
    color: #555;
`;

const LogoutButton = styled.button`
  padding: 8px 16px;
  border: 1px solid #c9c9c9ff;
  background-color: transparent;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #e6e6e6ff;
    border-color: #ccc;
  }
`;

const HelpButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #333;
  text-decoration: none;
  padding: 1rem;
  transition: color 0.2s;
  font-weight: 500;
  font-family: 'Poppins', sans-serif;
  font-size: 1em;
  
  &:hover {
    color: #0099ffff;
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
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;
  box-sizing: border-box;

  h2 {
    margin: 0;
    font-size: 1.2rem;
    color: #2c3e50;
  }
`;

const CloseButton = styled.button`
  width: 32px;
  height: 32px;

  background: none;
  border: none;
  font-size: 1.5rem;
  color: #868e96;
  cursor: pointer;
  padding: 5px;
  line-height: 1;
  transition: color 0.2s;

  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #2c3e50;
  }
`;

const PopupContent = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  text-align: left;
  color: #495057;

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
  color: #34495e;
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
        background-color: #eaf4ff;
        color: #3b82f6;
        padding: 4px 8px;
        border-radius: 5px;
        font-size: 0.95em;
    }
`;

export default Navbar;
