// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../Config/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    const userId = localStorage.getItem('userId');
    
    if (token && storedRole && userId) {
      setRole(storedRole);
      setUser({ id: userId });
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });
      
      console.log("Full API Response:", response.data);

      // Destructure based on your actual API response
      const { token, id, role: userRole } = response.data;

      if (token && userRole && id) {
        // Store in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('role', userRole);
        localStorage.setItem('userId', id);
        
        // Update state
        setUser({ id });
        setRole(userRole);
        
        return { success: true, role: userRole };
      } else {
        return { success: false, message: 'Missing token, id, or role from server' };
      }
    } catch (error) {
      console.error("Login failed:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage = error.response?.data?.message || 'Incorrect email or password';
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    setUser(null);
    setRole(null);
  };

  const value = { user, role, login, logout, loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};