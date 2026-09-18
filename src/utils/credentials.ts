import AsyncStorage from '@react-native-async-storage/async-storage';

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
