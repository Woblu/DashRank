// src/contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true); // Prevents UI flicker on load

  useEffect(() => {
    // This effect runs whenever the token changes or on initial load
    const initializeAuth = () => {
      if (token) {
        try {
          const decodedToken = jwtDecode(token);
          const currentTime = Date.now() / 1000;

          // If token is expired, log the user out
          if (decodedToken.exp < currentTime) {
            logout();
          } else {
            // If token is valid, set user state and default axios headers
            setUser({
              username: decodedToken.username,
              role: decodedToken.role,
            });
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Invalid token found in storage.', error);
          logout(); // Clear out the invalid token
        }
      }
      setLoading(false); // We're done checking, allow app to render
    };

    initializeAuth();
  }, [token]);

  const login = async (identifier, password) => {
    try {
      const response = await axios.post('/api/auth/login', { identifier, password });
      const { token: newToken, user: userData } = response.data;

      localStorage.setItem('token', newToken);
      setUser(userData);
      setToken(newToken); // This triggers the useEffect to set axios headers
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please try again.';
      console.error('Login failed:', errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
    // Remove the auth header from all future requests
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = { user, token, loading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);