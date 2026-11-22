import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { api, ApiError, setAuthToken } from '../api/client';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  isDbUnavailable: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  checkDbStatus: () => Promise<void>;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { name: string; email: string; password: string; currency?: string; monthlyIncome?: number }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  deleteAccount: (payload: { password: string; confirmText: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDbUnavailable, setIsDbUnavailable] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Check real-time database readiness via /api/health
  const checkDbStatus = useCallback(async () => {
    try {
      const health = await api.health.check();
      if (health?.database?.connected) {
        setIsDbUnavailable(false);
      } else if (health?.status === 'disconnected' || health?.database?.connected === false) {
        setIsDbUnavailable(true);
      }
    } catch {
      setIsDbUnavailable(true);
    }
  }, []);

  // Restore and verify authentication session on page load / refresh
  // Uses HttpOnly session cookie automatically via credentials: 'include'
  const verifySession = useCallback(async () => {
    try {
      setIsLoading(true);
      // Clean up any legacy localStorage tokens from prior phases
      try {
        localStorage.removeItem('finovax_token');
      } catch {}

      // Verify live database connectivity first
      try {
        const health = await api.health.check();
        if (health?.database?.connected) {
          setIsDbUnavailable(false);
        } else if (health?.status === 'disconnected' || health?.database?.connected === false) {
          setIsDbUnavailable(true);
        }
      } catch {
        setIsDbUnavailable(true);
      }

      const { user: userProfile } = await api.auth.getMe();
      setUser(userProfile);
      setAuthError(null);
      setIsDbUnavailable(false);
    } catch (err: any) {
      if (err instanceof ApiError && err.isDbUnavailable) {
        setIsDbUnavailable(true);
      }
      setUser(null);
      setAuthToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();

    // Check DB status on window focus or visibility change
    const onFocus = () => checkDbStatus();
    window.addEventListener('focus', onFocus);
    window.addEventListener('visibilitychange', onFocus);

    // Periodic heartbeat every 10 seconds to auto-recover if DB reconnected
    const timer = setInterval(checkDbStatus, 10000);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('visibilitychange', onFocus);
      clearInterval(timer);
    };
  }, [verifySession, checkDbStatus]);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      setAuthError(null);
      setIsLoading(true);
      const res = await api.auth.login(credentials);
      setAuthToken(res.token);
      setUser(res.user);
      setIsAuthModalOpen(false);
      setIsDbUnavailable(false);
    } catch (err: any) {
      if (err instanceof ApiError && err.isDbUnavailable) {
        setIsDbUnavailable(true);
      }
      setAuthError(err.message || 'Authentication failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    currency?: string;
    monthlyIncome?: number;
  }) => {
    try {
      setAuthError(null);
      setIsLoading(true);
      const res = await api.auth.register(data);
      setAuthToken(res.token);
      setUser(res.user);
      setIsAuthModalOpen(false);
      setIsDbUnavailable(false);
    } catch (err: any) {
      if (err instanceof ApiError && err.isDbUnavailable) {
        setIsDbUnavailable(true);
      }
      setAuthError(err.message || 'Registration failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Clear client state even if network call times out
    } finally {
      setAuthToken(null);
      setUser(null);
      setAuthError(null);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      const res = await api.auth.updateProfile(data);
      setUser(res.user);
    } catch (err: any) {
      throw err;
    }
  };

  const deleteAccount = async (payload: { password: string; confirmText: string }) => {
    try {
      setIsLoading(true);
      await api.auth.deleteAccount(payload);
    } finally {
      setAuthToken(null);
      setUser(null);
      setAuthError(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        authError,
        isDbUnavailable,
        isAuthModalOpen,
        setIsAuthModalOpen,
        checkDbStatus,
        login,
        register,
        logout,
        updateProfile,
        deleteAccount
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
