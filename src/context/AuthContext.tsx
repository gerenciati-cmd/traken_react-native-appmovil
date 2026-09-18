import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  loginRequest,
  logoutRequest,
  meRequest,
  setAuthToken,
  StationDTO,
  UserDTO,
} from '../api/client';
import { getLastProfile, saveLastEmail, saveLastProfile } from '../utils/credentials';

const TOKEN_KEY = 'traken_token';

type AuthContextValue = {
  token: string | null;
  user: UserDTO | null;
  stations: StationDTO[];
  isLoading: boolean;
  isAuthenticating: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserDTO | null>(null);
  const [stations, setStations] = useState<StationDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!storedToken) return;

        // No basta con confiar en el token guardado: pudo vencer o haber
        // sido revocado (logout desde otro lado). Se valida contra el
        // servidor antes de dar por buena la sesion... PERO solo se cierra
        // sesion cuando el servidor SI contesta y dice que el token ya no
        // sirve. Si no hay señal (la app debe funcionar sin datos), se
        // sigue con el token guardado y el ultimo perfil que se alcanzo a
        // cachear, en vez de mandar a la persona al login sin necesidad.
        setAuthToken(storedToken);
        try {
          const res = await meRequest();
          if (res.ok && res.user) {
            setToken(storedToken);
            setUser(res.user);
            setStations(res.stations ?? []);
            await saveLastProfile(res.user, res.stations ?? []);
          } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
            setAuthToken(null);
          }
        } catch (networkError) {
          const cached = await getLastProfile();
          setToken(storedToken);
          if (cached) {
            setUser(cached.user);
            setStations(cached.stations);
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const res = await loginRequest(email, password);
      if (res.ok && res.token && res.user) {
        await SecureStore.setItemAsync(TOKEN_KEY, res.token);
        await saveLastEmail(email);
        await saveLastProfile(res.user, res.stations ?? []);
        setAuthToken(res.token);
        setToken(res.token);
        setUser(res.user);
        setStations(res.stations ?? []);
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
    await logoutRequest();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setStations([]);
  };

  const clearError = () => setError(null);

  const value = useMemo(
    () => ({ token, user, stations, isLoading, isAuthenticating, error, login, logout, clearError }),
    [token, user, stations, isLoading, isAuthenticating, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
