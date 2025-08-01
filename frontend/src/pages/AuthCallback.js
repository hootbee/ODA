import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

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

  return <div>로그인 처리 중...</div>;
};

export default AuthCallback;
