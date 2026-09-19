import AsyncStorage from '@react-native-async-storage/async-storage';

// Marca de "hasta cuando ya viste" el historial de notificaciones, para el
// puntito rojo de la campana en Home -- guardado simple en el telefono,
// nada que sincronizar con el servidor.
const KEY = 'traken_notifications_last_seen';

export async function getLastSeenNotifications(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v ? parseInt(v, 10) : 0;
  } catch (e) {
    return 0;
  }
}

export async function markNotificationsSeen() {
  try {
    await AsyncStorage.setItem(KEY, String(Date.now()));
  } catch (e) {
    // No es critico.
  }
}
