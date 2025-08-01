import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styled from "styled-components";

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <Nav>
      <NavLinks>
        <StyledLink to="/">메인</StyledLink>
        <StyledLink to="/chat">채팅</StyledLink>
        <StyledLink to="/profile">프로필</StyledLink>
      </NavLinks>
      <AuthControls>
        {isAuthenticated ? (
          <>
            <WelcomeText>환영합니다, {user.name}!</WelcomeText>
            <LogoutButton onClick={logout}>로그아웃</LogoutButton>
          </>
        ) : (
          <StyledLink to="/login">로그인</StyledLink>
        )}
      </AuthControls>
    </Nav>
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
`;

const NavLinks = styled.div`
    display: flex;
    align-items: center;
`;

const AuthControls = styled.div`
    display: flex;
    align-items: center;
`;

const StyledLink = styled(Link)`
  color: #333;
  text-decoration: none;
  padding: 1rem;
  transition: color 0.2s;

  &:hover {
    color: #007bff;
  }
`;

const WelcomeText = styled.span`
    margin-right: 1rem;
    color: #555;
`;

const LogoutButton = styled.button`
  padding: 8px 16px;
  border: 1px solid #ddd;
  background-color: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #f5f5f5;
    border-color: #ccc;
  }
`;

export default Navbar;
