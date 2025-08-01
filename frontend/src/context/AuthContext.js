import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          // 백엔드의 /validate 엔드포인트를 사용하여 토큰 유효성 검증
          const response = await axios.post("http://localhost:8080/api/auth/validate", { token });

          if (response.data && response.data.valid) {
            setUser({ name: response.data.name, email: response.data.email });
          } else {
            localStorage.removeItem("token");
          }
        } catch (error) {
          console.error("Invalid token:", error);
          localStorage.removeItem("token");
        }
      }
      setLoading(false);
    };
    verifyUser();
  }, []);

  const login = () => {
    window.location.href = "http://localhost:8080/oauth2/authorization/google";
  };

  const logout = async () => {
    try {
      await axios.post("http://localhost:8080/api/auth/logout");
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      localStorage.removeItem("token");
      setUser(null);
      window.location.href = "/login";
    }
  };

  const authValue = {
    user,
    setUser,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
