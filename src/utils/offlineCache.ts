import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cache generico para pantallas de datos (Ordenes Abiertas, y las que
 * sigan): cada pantalla guarda aqui lo ultimo que cargo con exito, y si la
 * proxima peticion falla por falta de señal, se muestra esto en vez de una
 * pantalla vacia/de error. Es la version "app nativa" del mismo objetivo
 * que el service worker le da a la version web -- no depende de PWA, sirve
 * igual en Expo Go o en un build nativo real.
 */
const PREFIX = 'traken_cache_';

type CacheEntry<T> = { data: T; savedAt: number };

export async function saveCache<T>(key: string, data: T) {
  try {
    const entry: CacheEntry<T> = { data, savedAt: Date.now() };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    // No es critico: en el peor caso no hay nada que mostrar offline.
  }
}

export async function getCache<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null;
  } catch (e) {
    return null;
  }
}
