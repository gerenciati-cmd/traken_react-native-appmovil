import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { registerPushToken } from '../api/client';

/**
 * Notificaciones push (Expo Push Service). Llegan aunque la app este
 * cerrada porque las manda Expo directo al telefono (APNs en iOS, FCM en
 * Android), no dependen de que la app este corriendo.
 *
 * OJO Android: desde el SDK 53 de Expo, las notificaciones push REMOTAS no
 * funcionan dentro de Expo Go en Android (si en iOS) -- se necesita una
 * "development build" (compilada con EAS Build, ver eas.json) instalada
 * directo en el telefono. Ademas, con solo IMPORTAR expo-notifications
 * dentro de Expo Go en Android, la libreria misma tira un error fatal
 * ("runtime not ready"), asi que ni siquiera se puede importar de forma
 * estatica -- por eso el import es dinamico y se salta entero en ese caso.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export async function registerForPushNotificationsAsync(): Promise<void> {
  if (isExpoGo && Platform.OS === 'android') return;

  try {
    const Notifications = await import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (!Device.isDevice) return; // los emuladores no reciben push real

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Traken',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId: string | undefined =
      (Constants?.expoConfig?.extra as any)?.eas?.projectId ?? (Constants as any)?.easConfig?.projectId;
    if (!projectId) {
      // Todavia no hay proyecto EAS configurado (hace falta para builds de
      // desarrollo/produccion en Android). No truena nada, solo no se
      // puede pedir el token hasta que exista.
      return;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const deviceLabel = `${Platform.OS} - ${Device.modelName ?? 'dispositivo'}`;
    await registerPushToken(tokenResponse.data, deviceLabel);
  } catch (e) {
    // Nunca debe romper el login/arranque de la app por esto.
  }
}
