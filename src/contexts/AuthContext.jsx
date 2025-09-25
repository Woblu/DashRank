import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = () => {
      if (token) {
        try {
          const decodedToken = jwtDecode(token);
          const currentTime = Date.now() / 1000;
          
          if (decodedToken.exp < currentTime) {
            // Token is expired
            logout();
          } else {
            // Token is valid, set user state
            setUser({
              id: decodedToken.userId,
              username: decodedToken.username,
              role: decodedToken.role,
            });
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }
        } catch (error) {
          console.error("Invalid token found, logging out.", error);
          logout();
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, [token]);

  // REWRITTEN LOGIN FUNCTION
  // Its only job is to receive a new token and update the state.
  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken); // This triggers the useEffect above to decode the token and set the user
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  // We expose the full user object now
  const value = { user, token, loading, login, logout };
  
  // Don't render the app until we've checked for a token
  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};