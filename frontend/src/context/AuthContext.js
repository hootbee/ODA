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
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        try {
          const response = await axios.get(
            "http://localhost:8080/api/auth/user"
          );
          if (response.data && response.data.authenticated) {
            setUser(response.data);
          } else {
            localStorage.removeItem("token");
            delete axios.defaults.headers.common["Authorization"];
          }
        } catch (error) {
          console.error("Invalid token:", error);
          localStorage.removeItem("token");
          delete axios.defaults.headers.common["Authorization"];
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
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
