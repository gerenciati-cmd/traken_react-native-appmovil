import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StationDTO, UserDTO } from '../api/client';

// El ultimo correo usado se guarda aparte del token de sesion (que SI se
// borra al cerrar sesion): asi la proxima vez que se abra la app, el campo
// de usuario ya viene lleno aunque hayas cerrado sesion antes. La
// contrasena NUNCA se guarda aqui -- eso lo maneja el propio telefono
// (Llavero/Autofill) via los props textContentType/autoComplete del login.
const LAST_EMAIL_KEY = 'traken_last_email';

export async function saveLastEmail(email: string) {
  try {
    await AsyncStorage.setItem(LAST_EMAIL_KEY, email);
  } catch (e) {
    // No es critico: en el peor caso no se precarga la proxima vez.
  }
}

export async function getLastEmail(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(LAST_EMAIL_KEY)) ?? '';
  } catch (e) {
    return '';
  }
}

// Ultimo perfil (nombre, puesto, estaciones) que SI respondio el servidor.
// Sirve para que, si abres la app sin señal, veas tu info de la ultima vez
// en vez de que la app te mande al login solo porque no pudo confirmar el
// token en ese momento (ver AuthContext: solo se cierra sesion si el
// servidor CONTESTA que el token ya no sirve, nunca por falta de conexion).
const LAST_PROFILE_KEY = 'traken_last_profile';

type CachedProfile = { user: UserDTO; stations: StationDTO[] };

export async function saveLastProfile(user: UserDTO, stations: StationDTO[]) {
  try {
    await AsyncStorage.setItem(LAST_PROFILE_KEY, JSON.stringify({ user, stations }));
  } catch (e) {
    // No es critico.
  }
}

export async function getLastProfile(): Promise<CachedProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as CachedProfile) : null;
  } catch (e) {
    return null;
  }
}
