import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styled from "styled-components";

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <Nav>
      <NavLinks>
        <NavLink to="/"><LogoImage src={`${process.env.PUBLIC_URL}/ODA_logo.png`} alt="ODA Logo" /></NavLink>
        <StyledLink to="/chat">Chat</StyledLink>
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
    color: #0086dfff;
  }

  &.active {
    color: #0086dfff;
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

export default Navbar;
