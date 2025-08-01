import React from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import styled from "styled-components";

const LoginPage = () => {
  const { login, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <StatusText>Loading...</StatusText>;
  }

  if (isAuthenticated) {
    return <Navigate to="/profile" />;
  }

  return (
    <LoginContainer>
      <LoginBox>
        <h2>로그인</h2>
        <p>소셜 계정으로 간편하게 로그인하세요.</p>
        <GoogleButton onClick={login}>
          Google로 로그인
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
  background-color: #f0f2f5;
`;

const LoginBox = styled.div`
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const GoogleButton = styled.button`
  padding: 10px 24px;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #f5f5f5;
    border-color: #ccc;
  }
`;

const StatusText = styled.div`
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 18px;
`;

export default LoginPage;
