import React from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { FcGoogle } from "react-icons/fc";

const LoginPage = () => {
  const { login, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner />
        <StatusText>Loading...</StatusText>
      </LoadingContainer>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/profile" />;
  }

  return (
    <LoginContainer>
      <LoginBox>
        <LogoImage src={`${process.env.PUBLIC_URL}/JDK_logo.png`} alt="JDK Logo" />
        <TextContainer>
          <Title>로그인</Title>
          <Description>소셜 계정으로 간편하게 로그인하세요.</Description>
        </TextContainer>
        <GoogleButton onClick={login}>
          <FcGoogle /> Google 계정으로 로그인
        </GoogleButton>
      </LoginBox>
    </LoginContainer>
  );
};

const LoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(150deg, #f4f8ff 0%, #ffa0d7ff 100%);
`;

const LoginBox = styled.div`
  padding: 35px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  text-align: center;
  width: 90%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const LogoImage = styled.img`
  width: 150px;
  margin-bottom: 2rem;
`;

const TextContainer = styled.div`
  margin-bottom: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.8rem;
  font-weight: 600;
  color: #5e3440ff;
`;

const Description = styled.p`
  margin: 0;
  color: #96868bff;
  font-size: 1rem;
  line-height: 1.6;
`;

const GoogleButton = styled.button`
  width: 100%;
  padding: 12px 24px;
  border: 1px solid #e0e0e0;
  background-color: white;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 500;
  color: #684a54ff;
  cursor: pointer;
  transition: all 0.3s ease;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;

  &:hover {
    border-color: #c0c0c0;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  }
`;

const StatusText = styled.div`
    font-size: 1rem;
    color: #684a58ff;
    margin-top: 1rem;
`;

const LoadingContainer = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: linear-gradient(150deg, #f4f8ff 0%, #ffa0d7ff 100%);
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  margin-top: 50px; 
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top-color: #888; 
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

export default LoginPage;
