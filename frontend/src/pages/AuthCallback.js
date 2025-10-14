import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import styled, { keyframes } from "styled-components";

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      localStorage.setItem("token", token);
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const fetchUser = async () => {
        try {
          const response = await axios.get(
            "http://localhost:8080/api/auth/user"
          );
          if (response.data && response.data.authenticated) {
            setUser(response.data);
            navigate("/");
          } else {
            navigate("/login");
          }
        } catch (error) {
          console.error("Failed to fetch user info after callback", error);
          navigate("/login");
        }
      };
      fetchUser();
    } else {
      console.error("No token found in callback URL");
      navigate("/login");
    }
  }, [searchParams, navigate, setUser]);

  return (
    <LoadingContainer>
        <Spinner />
        <StatusText>로그인 처리 중...</StatusText>
    </LoadingContainer>
);
};

const LoadingContainer = styled.div`
    height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    padding-top: 20vh;
    background: linear-gradient(150deg, #f4f8ff 0%, #a1ceffff 100%);
    font-family: "Poppins", sans-serif;
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

const StatusText = styled.div`
    font-size: 1rem;
    color: #4a5568;
    margin-top: 1rem;
`;

export default AuthCallback;
