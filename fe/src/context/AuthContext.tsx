// @/context/AuthContext.tsx
'use client';

import { createApiClient } from '@/utils/api';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  username: string;
  phone: string;
  user_type: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  setUser: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check for saved token in localStorage on mount
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      // Optionally, fetch user data here if token is present
    }
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem('auth_token', token);
      setIsAuthenticated(true);
      fetchUserData(token);
    } else {
      localStorage.removeItem('auth_token');
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [token]);

  const fetchUserData = async (authToken: string) => {
    try {
      const apiClient = createApiClient(authToken);
      const response = await apiClient.get('/auth/profile');
      if (response.status === 200) {
        setUser(response.data);
      } else {
        console.error('Failed to fetch user data');
        setToken(null); // Clear token if it's invalid
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setToken(null);
    }
  };

  // In AuthContext.tsx, modify the login function:
  const login = (newToken: string) => {
    // Save to localStorage immediately, not just in the useEffect
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setIsAuthenticated(true);
    // Don't navigate here - let the component handle navigation
  };

  const logout = () => {
    setToken(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);