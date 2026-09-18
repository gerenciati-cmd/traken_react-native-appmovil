import axios from 'axios';

// Backend real de Traken en produccion. Se usa directo (no el Laragon local)
// para que el celular funcione sin depender de que la PC este prendida ni
// de estar en la misma WiFi.
export const API_BASE_URL = 'https://traken.mx/op/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Se llama al iniciar sesion (o al restaurar una guardada) para que TODAS
 * las peticiones siguientes manden el token automaticamente. */
export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export interface StationDTO {
  id: number;
  iata: string;
  name: string;
}

export interface UserDTO {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  role_id: number;
  role_name: string;
}

export interface LoginResponse {
  ok: boolean;
  token?: string;
  user?: UserDTO;
  stations?: StationDTO[];
  error?: string;
}

export interface MeResponse {
  ok: boolean;
  user?: UserDTO;
  stations?: StationDTO[];
  error?: string;
}

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login.php', {
    email,
    password,
    device: 'expo-app',
  });
  return data;
}

export async function meRequest(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>('/me.php');
  return data;
}

export async function logoutRequest(): Promise<void> {
  try {
    await api.post('/auth/logout.php');
  } catch (e) {
    // Si no hay conexion, no importa: igual se borra la sesion localmente.
  }
}

export interface OpenOrderDTO {
  id: number;
  folio: number;
  folio_display: string;
  id_airport: number;
  iata: string;
  airline: string;
  flight: string | null;
  date_in: string | null;
  type_airline: string;
}

export interface OpenOrdersResponse {
  ok: boolean;
  total?: number;
  total_anteriores?: number;
  orders?: OpenOrderDTO[];
  error?: string;
}

export async function getOpenOrders(): Promise<OpenOrdersResponse> {
  const { data } = await api.get<OpenOrdersResponse>('/orders/open.php');
  return data;
}

export interface CommentDTO {
  user_name: string;
  comment: string;
  created_at: string;
}

export interface CommentsResponse {
  ok: boolean;
  items?: CommentDTO[];
  error?: string;
}

export async function getComments(idOrder: number, idAirport: number): Promise<CommentsResponse> {
  const { data } = await api.get<CommentsResponse>('/orders/comments.php', {
    params: { id_order: idOrder, id_airport: idAirport },
  });
  return data;
}

export interface AddCommentResponse {
  ok: boolean;
  msg?: string;
  error?: string;
}

export async function addComment(
  idOrder: number,
  idAirport: number,
  comment: string
): Promise<AddCommentResponse> {
  const { data } = await api.post<AddCommentResponse>('/orders/commentAdd.php', {
    id_order: idOrder,
    id_airport: idAirport,
    comment,
  });
  return data;
}
