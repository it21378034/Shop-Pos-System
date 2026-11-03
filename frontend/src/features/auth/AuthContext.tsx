import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, AuthResponse } from '../../types';
import { api } from '../../services/api';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('grocerypro_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('grocerypro_token');
    if (token) {
      api.get<UserProfile>('/auth/me')
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('grocerypro_user', JSON.stringify(res.data));
          if (res.data.locationId) {
            localStorage.setItem('grocerypro_location_id', res.data.locationId);
          }
        })
        .catch(() => {
          localStorage.removeItem('grocerypro_token');
          localStorage.removeItem('grocerypro_user');
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: { username: string; password: string }) => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    const { accessToken, user: userData } = response.data;
    localStorage.setItem('grocerypro_token', accessToken);
    localStorage.setItem('grocerypro_user', JSON.stringify(userData));
    if (userData.locationId) {
      localStorage.setItem('grocerypro_location_id', userData.locationId);
    }
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('grocerypro_token');
    localStorage.removeItem('grocerypro_user');
    setUser(null);
    window.location.href = '/login';
  };

  const hasRole = (role: string) => {
    return user?.roles.includes(role) || user?.roles.includes('SuperAdmin') || false;
  };

  const hasPermission = (permission: string) => {
    return user?.permissions.includes(permission) || user?.roles.includes('SuperAdmin') || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
