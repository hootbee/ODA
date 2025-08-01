import React from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import styled from "styled-components";

const ProfilePage = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <StatusText>Loading...</StatusText>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <ProfileContainer>
        <ProfileCard>
            <h2>프로필 정보</h2>
            <ProfileImage src={user.picture} alt="Profile" />
            <p><strong>이름:</strong> {user.name}</p>
            <p><strong>이메일:</strong> {user.email}</p>
        </ProfileCard>
    </ProfileContainer>
  );
};

const ProfileContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #f0f2f5;
`;

const ProfileCard = styled.div`
    padding: 40px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    text-align: center;
`;

const ProfileImage = styled.img`
    border-radius: 50%;
    width: 100px;
    height: 100px;
    margin-bottom: 20px;
`;

const StatusText = styled.div`
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 18px;
`;

export default ProfilePage;
