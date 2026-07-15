import React, { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";

//global variable accessed using usecontext
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkUser = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    //executing this function after first loading
    checkUser();
  }, []);

  //updating local state after login
  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Always clear local state
      setUser(null);
      setIsAuthenticated(false);
      
      // Re-validate authentication after a small delay to ensure logout is processed
      setTimeout(async () => {
        try {
          await authService.getCurrentUser();
          console.warn("User still authenticated after logout attempt");
        } catch (error) {
          // Expected - user should not be authenticated
          console.log("Logout successful");
        }
      }, 500);
    }
  };
  //wrapping all variables into this object 
  const value = {
    user,
    setUser,
    loading,
    isAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
