import React from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { FaUser } from 'react-icons/fa';

const ProfilePage = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner />
        <StatusText>Loading...</StatusText>
      </LoadingContainer>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <ProfileContainer>
      <ProfileCard>
        <CardTitle><FaUser />프로필 정보</CardTitle>
          <ProfileImage src={user.picture} alt="Profile" referrerPolicy="no-referrer" />
            <InfoContainer>
              <InfoBlock>
                <InfoLabel>이름</InfoLabel>
                <InfoValue>{user.name}</InfoValue>
              </InfoBlock>
              <InfoBlock>
                <InfoLabel>이메일</InfoLabel>
                <InfoValue>{user.email}</InfoValue>
              </InfoBlock>
            </InfoContainer>
      </ProfileCard>
    </ProfileContainer>
  );
};

const ProfileContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(150deg, #f4fffaff 0%, #a0ffd7ff 100%);
`;

const ProfileCard = styled.div`
  width: 90%;
  max-width: 420px;
  padding: 40px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const CardTitle = styled.h2`
  width: 100%; 
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c503dff;
  margin: 0 0 10px 0;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f5f3ff;
  text-align: center;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const ProfileImage = styled.img`
    border-radius: 50%;
    width: 100px;
    height: 100px;
    margin-top: 30px;
    margin-bottom: 10px;
`;

const InfoContainer = styled.div`
  width: 100%;
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const InfoBlock = styled.div`
  display: flex;
  align-items: center;
  background-color: #f8faf9ff;
  padding: 12px 16px;
  border-radius: 20px;
  border: 1px solid #f1f5f4ff;
`;

const InfoLabel = styled.span`
  width: 60px; 
  flex-shrink: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: #86968fff;
  text-align: left;
`;

const InfoValue = styled.span`
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c5041ff;
`;

const LoadingContainer = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: linear-gradient(150deg, #f4fffaff 0%, #a0ffd7ff 100%);
`;

const StatusText = styled.div`
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 18px;
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

export default ProfilePage;
