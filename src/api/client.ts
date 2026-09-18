import axios from 'axios';

// Backend real de Traken (Laragon), accesible por IP de red local para que
// tu celular con Expo Go (misma WiFi que tu PC) pueda llegar a él —
// "traken.test" solo resuelve dentro de tu PC, por eso NO se usa aquí.
// Si la IP de tu PC cambia (otra red, reinicio del router), actualízala aquí.
// Para emulador Android usa 'http://10.0.2.2/traken/api' en su lugar.
export const API_BASE_URL = 'http://192.168.2.13/traken/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface LoginResponse {
  token?: string;
  error?: string;
}

export async function loginRequest(username: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/index.php?action=login', {
    username,
    password,
  });
  return data;
}
