import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiEnvironment, DEFAULT_ENVIRONMENT, PRODUCTION_UNLOCKED } from '../config/environment';

const KEY = 'traken_api_environment';

export async function getStoredEnvironment(): Promise<ApiEnvironment> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    // Si Produccion no esta liberada todavia, nunca se respeta un valor
    // guardado de "production" (por si se libera y se vuelve a bloquear
    // despues) -- siempre cae de vuelta a sandbox.
    if (v === 'production' && !PRODUCTION_UNLOCKED) return DEFAULT_ENVIRONMENT;
    return v === 'production' ? 'production' : DEFAULT_ENVIRONMENT;
  } catch (e) {
    return DEFAULT_ENVIRONMENT;
  }
}

export async function saveStoredEnvironment(env: ApiEnvironment) {
  try {
    await AsyncStorage.setItem(KEY, env);
  } catch (e) {
    // No es critico.
  }
}
