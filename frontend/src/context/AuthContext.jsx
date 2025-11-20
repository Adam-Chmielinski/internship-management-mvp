import React, { createContext, useContext, useState, useEffect } from 'react';
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
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();
      console.log("Full API Response:", data);

      if (!response.ok) {
        console.error("Error response:", data);
        const errorMessage = data.message || 'Incorrect email or password';
        return {
          success: false,
          message: errorMessage,
        };
      }

      const { token, id, role: userRole } = data;

      if (token && userRole && id) {
        localStorage.setItem('token', token);
        localStorage.setItem('role', userRole);
        localStorage.setItem('userId', id);
        
        setUser({ id });
        setRole(userRole);
        
        return { success: true, role: userRole };
      } else {
        return { success: false, message: 'Missing token, id, or role from server' };
      }
    } catch (error) {
      console.error("Login failed:", error);
      
      return {
        success: false,
        message: 'Network error or server is unavailable. Please try again.',
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