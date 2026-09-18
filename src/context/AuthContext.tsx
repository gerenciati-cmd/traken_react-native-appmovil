import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { loginRequest } from '../api/client';

const TOKEN_KEY = 'traken_token';
const USER_KEY = 'traken_username';

type AuthContextValue = {
  token: string | null;
  username: string | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedUser = await SecureStore.getItemAsync(USER_KEY);
        if (storedToken) setToken(storedToken);
        if (storedUser) setUsername(storedUser);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (user: string, password: string) => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const res = await loginRequest(user, password);
      if (res.token) {
        await SecureStore.setItemAsync(TOKEN_KEY, res.token);
        await SecureStore.setItemAsync(USER_KEY, user);
        setToken(res.token);
        setUsername(user);
        return true;
      }
      setError(res.error ?? 'Credenciales inválidas');
      return false;
    } catch (e) {
      setError('No se pudo conectar con el servidor de Traken');
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setToken(null);
    setUsername(null);
  };

  const clearError = () => setError(null);

  const value = useMemo(
    () => ({ token, username, isLoading, isAuthenticating, error, login, logout, clearError }),
    [token, username, isLoading, isAuthenticating, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
