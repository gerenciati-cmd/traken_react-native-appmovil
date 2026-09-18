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

export interface SendEmailResponse {
  ok: boolean;
  msg?: string;
  error?: string;
}

export async function sendOrderEmail(folio: number, idAirport: number): Promise<SendEmailResponse> {
  const { data } = await api.post<SendEmailResponse>('/orders/sendEmail.php', {
    folio,
    id_airport: idAirport,
  });
  return data;
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

export interface HotelDTO {
  id: number;
  name: string;
  rooms_dis: number;
}

export interface HotelsResponse {
  ok: boolean;
  hotels?: HotelDTO[];
  default_date_out?: string | null;
  default_hour?: string | null;
  error?: string;
}

export async function getHotelsForOrder(idOrder: number, idAirport: number): Promise<HotelsResponse> {
  const { data } = await api.get<HotelsResponse>('/orders/hotels.php', {
    params: { id_order: idOrder, id_airport: idAirport },
  });
  return data;
}

export type PaxType = 'adulto' | 'nino' | 'infante';

export interface PaxEntry {
  name: string;
  voucher?: string;
  f_salida: string;
  hora: string;
  type: PaxType;
  chek?: 0 | 1 | 2;
  age_c?: number;
  age_i?: number;
  breakfast?: number;
  lunch?: number;
  dinner?: number;
}

export interface AddPaxPayload {
  id_order: number;
  id_airport: number;
  id_hotel: number;
  type_airline: string;
  ocupation?: string;
  /** Una habitacion puede traer varios pasajeros (ej. una familia); todos
   * comparten la misma habitacion y solo cuentan como 1 cuarto ocupado. */
  passengers: PaxEntry[];
}

export interface AddPaxResponse {
  ok: boolean;
  status?: 'exito' | 'dispo' | 'error';
  msg?: string;
  error?: string;
}

export async function addPax(payload: AddPaxPayload): Promise<AddPaxResponse> {
  const { data } = await api.post<AddPaxResponse>('/orders/addPax.php', payload);
  return data;
}

export interface NamedOption {
  id: number;
  name: string;
}

export interface TransportOptionsResponse {
  ok: boolean;
  hotels?: NamedOption[];
  transports?: NamedOption[];
  units?: NamedOption[];
  error?: string;
}

export async function getTransportOptions(idOrder: number, idAirport: number): Promise<TransportOptionsResponse> {
  const { data } = await api.get<TransportOptionsResponse>('/orders/transportOptions.php', {
    params: { id_order: idOrder, id_airport: idAirport },
  });
  return data;
}

export type TransportDirection = 'in' | 'out';

export interface AddTransportPayload {
  id_order: number;
  id_airport: number;
  id_hotel: number;
  id_transport: number;
  unit: number;
  quantity: number;
  pax: number;
  direction: TransportDirection;
}

export interface AddTransportResponse {
  ok: boolean;
  status?: 'exito' | 'error';
  msg?: string;
  error?: string;
}

export async function addTransport(payload: AddTransportPayload): Promise<AddTransportResponse> {
  const { data } = await api.post<AddTransportResponse>('/orders/addTransport.php', payload);
  return data;
}

export interface CloseOrderResponse {
  ok: boolean;
  status?: 'exito' | 'error';
  msg?: string;
  reasons?: string[];
  error?: string;
}

export async function closeOrder(folio: number, idAirport: number): Promise<CloseOrderResponse> {
  const { data } = await api.post<CloseOrderResponse>('/orders/closeOrder.php', {
    id_order: folio,
    id_airport: idAirport,
  });
  return data;
}

export interface CancelOrderResponse {
  ok: boolean;
  status?: 'exito' | 'error';
  msg?: string;
  error?: string;
}

export async function cancelOrder(folio: number, idAirport: number): Promise<CancelOrderResponse> {
  const { data } = await api.post<CancelOrderResponse>('/orders/cancelOrder.php', {
    id_order: folio,
    id_airport: idAirport,
  });
  return data;
}

/**
 * El PDF de vouchers vive fuera de op/api/ (op/modulos/open/voucherPdfDownload.php,
 * el mismo generador que ya usa la web) porque genera un PDF con TCPDF, no
 * JSON. voucherPdfDownload.php se modifico para aceptar TAMBIEN un token
 * Bearer ademas de la sesion de navegador (ver el comentario en ese archivo).
 *
 * La descarga en si NO pasa por este cliente axios: un PDF de varias
 * centenas de KB como ArrayBuffer via axios/XHR en React Native no es
 * confiable (el puente JS<->nativo viejo no maneja bien binarios grandes
 * asi). En vez de eso, la pantalla usa expo-file-system
 * (File.createDownloadTask) para bajarlo nativo directo a disco, mandando
 * el token como header. Aqui solo se arma la URL + el valor del header.
 */
export function getVoucherPdfUrl(folio: number, idAirport: number): string {
  return `https://traken.mx/op/modulos/open/voucherPdfDownload.php?id=${folio}&id_airport=${idAirport}`;
}

export function getAuthHeader(): string | undefined {
  return api.defaults.headers.common['Authorization'] as string | undefined;
}

export interface ExistingPaxDTO {
  id: number;
  name: string;
  voucher: string;
  date_out: string;
  hour: string;
  type: PaxType;
  id_hotel: number;
  hotel_name: string;
  age_c: number;
  age_i: number;
  chek: 0 | 1 | 2;
  ocupation: string;
  breakfast: number;
  lunch: number;
  dinner: number;
}

export interface PaxListResponse {
  ok: boolean;
  items?: ExistingPaxDTO[];
  error?: string;
}

export async function getOrderPax(idOrder: number, idAirport: number): Promise<PaxListResponse> {
  const { data } = await api.get<PaxListResponse>('/orders/pax.php', {
    params: { id_order: idOrder, id_airport: idAirport },
  });
  return data;
}

export interface UpdatePaxPayload {
  id_pax: number;
  id_order: number;
  id_airport: number;
  name: string;
  voucher?: string;
  f_salida: string;
  hora: string;
  type: PaxType;
  id_hotel: number;
  chek?: 0 | 1 | 2;
  age_c?: number;
  age_i?: number;
  ocupation?: string;
  breakfast?: number;
  lunch?: number;
  dinner?: number;
}

export interface UpdatePaxResponse {
  ok: boolean;
  msg?: string;
  error?: string;
}

export async function updatePax(payload: UpdatePaxPayload): Promise<UpdatePaxResponse> {
  const { data } = await api.post<UpdatePaxResponse>('/orders/updatePax.php', payload);
  return data;
}

export interface RegisterPushTokenResponse {
  ok: boolean;
  msg?: string;
  error?: string;
}

export async function registerPushToken(token: string, device?: string): Promise<RegisterPushTokenResponse> {
  const { data } = await api.post<RegisterPushTokenResponse>('/push/register.php', { token, device });
  return data;
}
