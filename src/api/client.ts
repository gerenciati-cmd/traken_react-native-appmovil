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
 * Crear O.S. -- equivalente movil de op/modulos/create/inicio.php +
 * insertNewOrder.php. Catalogos en 3 pasos (igual que la web: primero
 * estacion+evento, luego aerolineas de esa estacion, luego hoteles de esa
 * estacion) y el envio final que crea la orden de verdad.
 */
export interface StationOption {
  id: number;
  iata: string;
  name: string;
}

export interface CreateOrderOptionsResponse {
  ok: boolean;
  stations?: StationOption[];
  events?: NamedOption[];
  error?: string;
}

export async function getCreateOrderOptions(): Promise<CreateOrderOptionsResponse> {
  const { data } = await api.get<CreateOrderOptionsResponse>('/orders/createOrderOptions.php');
  return data;
}

export interface CreateOrderCatalogResponse {
  ok: boolean;
  airlines?: NamedOption[];
  hotels?: NamedOption[];
  error?: string;
}

export async function getCreateOrderAirlines(idAirport: number): Promise<CreateOrderCatalogResponse> {
  const { data } = await api.get<CreateOrderCatalogResponse>('/orders/createOrderAirlines.php', {
    params: { id_airport: idAirport },
  });
  return data;
}

export async function getCreateOrderHotels(idAirport: number): Promise<CreateOrderCatalogResponse> {
  const { data } = await api.get<CreateOrderCatalogResponse>('/orders/createOrderHotels.php', {
    params: { id_airport: idAirport },
  });
  return data;
}

export interface CreateOrderHotelInput {
  id_hotel: number;
  dispo: number;
}

export interface CreateOrderPayload {
  id_airport: number;
  flight: string;
  event: number;
  airline: number;
  date_in: string;
  date_out: string;
  hour: string;
  hotels: CreateOrderHotelInput[];
  codigo_verif?: string;
}

export interface CreateOrderResponse {
  ok: boolean;
  error?: string;
  msg?: string;
  sc?: boolean;
  code?: string;
  folio?: number;
}

export async function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  const { data } = await api.post<CreateOrderResponse>('/orders/createOrder.php', payload);
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

/**
 * Delay Info (Aviso de Retraso) -- misma pareja de endpoints que usa el
 * modal "Delay" en op/modulos/open/inicio.php (descargar.php / enviar_correo.php).
 * Esos 2 archivos NUNCA validaron $_SESSION (ni siquiera en la web), asi que
 * el movil los llama directo con su URL completa, sin token: es exactamente
 * la misma llamada que ya hace el navegador, solo que desde la app. Cero
 * cambios en el backend para esta funcion.
 */
export interface DelayFormData {
  lang: string;
  airline: string;
  flight: string;
  dest: string;
  pickup: string;
  departure: string;
  date: string;
  folio: string;
  estacion: string;
}

const DELAY_BASE_URL = 'https://traken.mx/op/modulos/delayInfo';

export function getDelayImageUrl(d: DelayFormData): string {
  const qs = new URLSearchParams({ ...d, dl: '1' }).toString();
  return `${DELAY_BASE_URL}/descargar.php?${qs}`;
}

/** Igual que getDelayImageUrl pero SIN forzar la descarga (inline) -- para
 * mostrar la imagen real (con el logo de la aerolinea y el QR de verdad,
 * generados por el servidor) directo en un <Image> como vista previa. */
export function getDelayPreviewUrl(d: DelayFormData): string {
  const qs = new URLSearchParams({ ...d }).toString();
  return `${DELAY_BASE_URL}/descargar.php?${qs}`;
}

export interface SendDelayEmailResponse {
  ok: boolean;
  msg?: string;
}

export async function sendDelayEmail(to: string, d: DelayFormData): Promise<SendDelayEmailResponse> {
  const body = new URLSearchParams({ to, ...d }).toString();
  const { data } = await axios.post<SendDelayEmailResponse>(`${DELAY_BASE_URL}/enviar_correo.php`, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 20000,
  });
  return data;
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
  voucher_img_url: string | null;
  voucher_img_removed: boolean;
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

// ===== Escaneo y manejo de foto de voucher =====================

export interface ScanVoucherResponse {
  ok: boolean;
  nombre?: string;
  msg?: string;
}

/** Manda la foto a la IA (Claude), igual que la web. Puede tardar -- quien
 * llama debe manejar sus propios timeouts/UI de espera (ver
 * src/utils/voucherScan.ts, que replica los mismos tiempos que la web). */
export async function scanVoucherAI(
  fileUri: string,
  idOrder?: number,
  idAirport?: number
): Promise<ScanVoucherResponse> {
  const form = new FormData();
  form.append('foto', { uri: fileUri, name: 'voucher.jpg', type: 'image/jpeg' } as any);
  if (idOrder) form.append('id_order', String(idOrder));
  if (idAirport) form.append('id_airport', String(idAirport));
  const { data } = await api.post<ScanVoucherResponse>('/vouchers/scan.php', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 50000,
  });
  return data;
}

export async function logVoucherScan(
  modo: 'ocr' | 'manual',
  exito: boolean,
  idOrder?: number,
  idAirport?: number,
  mensaje?: string
): Promise<void> {
  try {
    await api.post('/vouchers/logScan.php', { modo, exito, id_order: idOrder, id_airport: idAirport, mensaje });
  } catch (e) {
    // No es critico si este aviso no llega.
  }
}

export interface VoucherPhotoResponse {
  ok: boolean;
  filename?: string;
  url?: string;
  msg?: string;
  error?: string;
}

export async function uploadVoucherPhoto(
  idPax: number,
  idOrder: number,
  idAirport: number,
  fileUri: string
): Promise<VoucherPhotoResponse> {
  const form = new FormData();
  form.append('foto', { uri: fileUri, name: 'voucher.jpg', type: 'image/jpeg' } as any);
  form.append('id_pax', String(idPax));
  form.append('id_order', String(idOrder));
  form.append('id_airport', String(idAirport));
  const { data } = await api.post<VoucherPhotoResponse>('/vouchers/upload.php', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
  return data;
}

export async function removeVoucherPhoto(idPax: number, idOrder: number, idAirport: number): Promise<VoucherPhotoResponse> {
  const { data } = await api.post<VoucherPhotoResponse>('/vouchers/remove.php', {
    id_pax: idPax,
    id_order: idOrder,
    id_airport: idAirport,
  });
  return data;
}

export async function restoreVoucherPhoto(idPax: number, idOrder: number, idAirport: number): Promise<VoucherPhotoResponse> {
  const { data } = await api.post<VoucherPhotoResponse>('/vouchers/restore.php', {
    id_pax: idPax,
    id_order: idOrder,
    id_airport: idAirport,
  });
  return data;
}

/**
 * Bitacora / Auditoria -- SOLO para el admin maestro (misma cuenta que
 * admin/modulos/appUsage/inicio.php en la web). Misma tabla `auditoria` que
 * ya usa toda la web (aps_audit()); cada evento trae 'origen' ('movil' o
 * 'web') para poder distinguir de un vistazo que accion vino de la app.
 */
export type AuditOrigen = 'movil' | 'web';

export interface AuditLogItem {
  id: number;
  fecha: string;
  usuario: string;
  origen: AuditOrigen;
  modulo: string;
  entidad: string;
  registro_id: string;
  referencia: string;
  accion: string;
  campo: string;
  valor_anterior: string;
  valor_nuevo: string;
  detalle: string;
}

export interface AuditLogResponse {
  ok: boolean;
  items?: AuditLogItem[];
  total?: number;
  page?: number;
  per_page?: number;
  has_more?: boolean;
  error?: string;
}

export interface AuditLogFilters {
  page?: number;
  modulo?: string;
  accion?: string;
  origen?: AuditOrigen;
  q?: string;
}

export async function getAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogResponse> {
  const { data } = await api.get<AuditLogResponse>('/admin/auditLog.php', { params: filters });
  return data;
}

/**
 * Resumen por Estacion -- equivalente movil de op/modulos/resumen/inicio.php.
 * Solo lectura: operaciones/habitaciones/pasajeros del mes, por estacion.
 */
export interface ResumenRow {
  iata: string;
  airportName: string;
  operaciones: number;
  habitaciones: number;
  adultos: number;
  menores: number;
  infantes: number;
}

export interface ResumenTotales {
  operaciones: number;
  habitaciones: number;
  adultos: number;
  menores: number;
  infantes: number;
}

export interface ResumenResponse {
  ok: boolean;
  periodo?: string;
  mes_label?: string;
  es_admin_general?: boolean;
  rows?: ResumenRow[];
  totales?: ResumenTotales;
  error?: string;
}

export async function getResumenEstacion(periodo?: string): Promise<ResumenResponse> {
  const { data } = await api.get<ResumenResponse>('/reports/resumen.php', {
    params: periodo ? { periodo } : {},
  });
  return data;
}

/**
 * Vuelos en Tiempo Real -- equivalente movil (solo vista de lista; el mapa
 * Leaflet de la web queda pendiente) de op/modulos/open/live_flights.php.
 * Mismo cache en disco del lado del servidor (ver op/include/liveFlights.php).
 */
export interface LiveFlightRow {
  icao24: string | null;
  callsign: string;
  airline: string | null;
  lat: number;
  lon: number;
  origen: string | null;
  alt_ft: number | null;
  alt_m: number | null;
  speed_kmh: number | null;
  speed_kt: number | null;
  vrate_ms: number | null;
  track_deg: number | null;
  fase: 'ascenso' | 'descenso' | 'nivel';
  dist_km: number;
  bearing: number | null;
  rumbo: string | null;
  mi_os: boolean;
  mi_os_folio: string | null;
}

export interface LiveFlightAirport {
  iata: string;
  name: string;
  unsupported?: boolean;
  icao?: string;
  lat?: number;
  lon?: number;
  live?: LiveFlightRow[];
  updated_at?: number;
}

export interface LiveFlightsResponse {
  ok: boolean;
  airports?: LiveFlightAirport[];
  server_time?: number;
  error?: string;
}

export async function getLiveFlights(): Promise<LiveFlightsResponse> {
  const { data } = await api.get<LiveFlightsResponse>('/orders/liveFlights.php');
  return data;
}

/**
 * TODAS las ordenes del usuario (no solo abiertas) -- fuente comun para
 * Detalles O.S., Reportes y Editar O.S. en el movil.
 */
export interface AnyOrderDTO {
  id: number;
  folio: number;
  folio_display: string;
  id_airport: number;
  iata: string;
  airline: string;
  flight: string | null;
  status: 'open' | 'close' | 'cancel';
  event_name: string | null;
  date_in: string | null;
  type_airline: string;
}

export interface AllOrdersResponse {
  ok: boolean;
  total?: number;
  total_anteriores?: number;
  orders?: AnyOrderDTO[];
  error?: string;
}

export async function getAllOrders(): Promise<AllOrdersResponse> {
  const { data } = await api.get<AllOrdersResponse>('/orders/allOrders.php');
  return data;
}

/** Detalle de una O.S. -- equivalente movil de op/modulos/details/details.php. */
export interface OrderDetailInfo {
  folio_display: string;
  airline: string;
  flight: string | null;
  event_name: string | null;
  status: string;
  date_in: string | null;
  date_out: string | null;
  hour: string | null;
  hotels: string[];
}

export interface OrderDetailPax {
  id: number;
  name: string;
  type: string;
  date_out: string | null;
}

export interface OrderDetailRoom {
  id_orders_open: number;
  updated_by: string | null;
  pax: OrderDetailPax[];
}

export interface OrderDetailHotelGroup {
  hotel_name: string;
  rooms: OrderDetailRoom[];
}

export interface OrderDetailResponse {
  ok: boolean;
  order?: OrderDetailInfo;
  hoteles_pax?: OrderDetailHotelGroup[];
  error?: string;
}

export async function getOrderDetail(folio: number, idAirport: number): Promise<OrderDetailResponse> {
  const { data } = await api.get<OrderDetailResponse>('/orders/orderDetail.php', {
    params: { id: folio, id_airport: idAirport },
  });
  return data;
}

/**
 * Reportes -- equivalente movil de op/modulos/reports/inicio.php +
 * report.php. La lista comparte getAllOrders(); esto es el "picker" por
 * O.S. (un reporte Excel por hotel + uno General) y el envio por correo.
 */
export interface ReportHotel {
  id_hotel: number;
  name: string;
  total_pax: number;
}

export interface ReportListResponse {
  ok: boolean;
  folio_display?: string;
  script?: 'paxes' | 'paxes_ep';
  hotels?: ReportHotel[];
  total_general?: number;
  error?: string;
}

export async function getReportList(folio: number, idAirport: number): Promise<ReportListResponse> {
  const { data } = await api.get<ReportListResponse>('/reports/list.php', {
    params: { id: folio, id_airport: idAirport },
  });
  return data;
}

/**
 * Descarga directa del Excel -- mismo endpoint que ya usa la web
 * (paxes.php / paxes_ep.php), que igual que descargar.php de Delay Info
 * nunca exigio sesion, asi que el movil lo llama directo sin token.
 */
export function getReportDownloadUrl(script: 'paxes' | 'paxes_ep', idOrder: number, idHotel: number, idAirport: number): string {
  return `https://traken.mx/op/modulos/reports/${script}.php?id_hotel=${idHotel}&id_order=${idOrder}&id_airport=${idAirport}`;
}

export interface SendReportResponse {
  ok: boolean;
  msg?: string;
  error?: string;
}

export async function sendReportByEmail(payload: {
  id_order: number;
  id_hotel: number;
  id_airport: number;
  email: string;
  script: 'paxes' | 'paxes_ep';
}): Promise<SendReportResponse> {
  const { data } = await api.post<SendReportResponse>('/reports/sendReport.php', payload, {
    timeout: 60000,
  });
  return data;
}

/**
 * Editar O.S. -- equivalente movil de op/modulos/createEdit/*. Aeropuerto y
 * aerolinea son de solo lectura aqui (igual que en el formulario web).
 */
export interface EditOrderInfo {
  folio_display: string;
  iata: string;
  airline: string;
  flight: string | null;
  id_event: number;
  date_in: string | null;
  date_out: string | null;
  hour: string | null;
  status: 'open' | 'close' | 'cancel';
}

export interface EditOrderHotel {
  id_orders_hotels: number;
  id_hotel: number;
  name: string;
  rooms_dis: number;
}

export interface EditOrderInfoResponse {
  ok: boolean;
  order?: EditOrderInfo;
  hotels?: EditOrderHotel[];
  error?: string;
}

export async function getEditOrderInfo(folio: number, idAirport: number): Promise<EditOrderInfoResponse> {
  const { data } = await api.get<EditOrderInfoResponse>('/orders/editOrderInfo.php', {
    params: { id: folio, id_airport: idAirport },
  });
  return data;
}

export interface UpdateOrderHotelInput {
  id_orders_hotels?: number;
  id_hotel: number;
  dispo: number;
}

export interface UpdateOrderPayload {
  id_order: number;
  id_airport: number;
  flight: string;
  event: number;
  date_in: string;
  date_out: string;
  hour: string;
  hotels: UpdateOrderHotelInput[];
  deleted_hotel_ids: number[];
}

export interface UpdateOrderResponse {
  ok: boolean;
  msg?: string;
  error?: string;
}

export async function updateOrder(payload: UpdateOrderPayload): Promise<UpdateOrderResponse> {
  const { data } = await api.post<UpdateOrderResponse>('/orders/updateOrder.php', payload);
  return data;
}

export interface ToggleStatusResponse {
  ok: boolean;
  status?: string;
  msg?: string;
  error?: string;
}

export async function toggleOrderStatus(
  folio: number,
  idAirport: number,
  re: 'reopen' | 'reclose'
): Promise<ToggleStatusResponse> {
  const { data } = await api.post<ToggleStatusResponse>('/orders/toggleStatus.php', {
    id_order: folio,
    id_airport: idAirport,
    re,
  });
  return data;
}

/**
 * Comprobantes (fotos/PDF) de una O.S. -- equivalente movil de
 * op/modulos/details/up.php + insert.php + view.php.
 */
export interface OrderFileDTO {
  name: string;
  url: string;
  type: 'image' | 'pdf';
  size: number;
  uploaded_at: number | null;
}

export interface OrderFilesResponse {
  ok: boolean;
  files?: OrderFileDTO[];
  error?: string;
}

export async function getOrderFiles(folio: number, idAirport: number): Promise<OrderFilesResponse> {
  const { data } = await api.get<OrderFilesResponse>('/details/files.php', {
    params: { id: folio, id_airport: idAirport },
  });
  return data;
}

export interface UploadOrderFilesResponse {
  ok: boolean;
  subidos?: string[];
  rechazados?: string[];
  error?: string;
}

/**
 * Historial de notificaciones -- lee push_notifications_log (la misma tabla
 * que llena aps_push_notify_station() en cada creacion/cierre/cancelacion
 * de O.S. y alta/edicion de pax/transporte). Sirve como bandeja aunque el
 * push remoto todavia no funcione en este dispositivo (Expo Go en Android
 * no lo soporta -- se necesita una build compilada).
 */
export interface NotificationItem {
  id: number;
  iata: string | null;
  evento: string | null;
  titulo: string | null;
  cuerpo: string | null;
  sent_at: string;
}

export interface NotificationsResponse {
  ok: boolean;
  items?: NotificationItem[];
  total?: number;
  page?: number;
  has_more?: boolean;
  error?: string;
}

export async function getNotifications(page = 1): Promise<NotificationsResponse> {
  const { data } = await api.get<NotificationsResponse>('/notifications/list.php', { params: { page } });
  return data;
}

export async function uploadOrderFiles(
  folio: number,
  idAirport: number,
  pickedFiles: { uri: string; name: string; mimeType: string }[]
): Promise<UploadOrderFilesResponse> {
  const form = new FormData();
  form.append('id_order', String(folio));
  form.append('id_airport', String(idAirport));
  pickedFiles.forEach((f) => {
    // @ts-expect-error React Native's FormData acepta este shape para archivos locales.
    form.append('file[]', { uri: f.uri, name: f.name, type: f.mimeType });
  });
  const { data } = await api.post<UploadOrderFilesResponse>('/details/upload.php', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return data;
}
