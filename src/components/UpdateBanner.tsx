import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { colors, radii, shadow } from '../theme/colors';

/**
 * Aviso de "hay una actualizacion nueva" -- por defecto expo-updates baja
 * la actualizacion OTA en segundo plano pero solo la aplica hasta que el
 * usuario cierre y vuelva a abrir la app por su cuenta, sin avisarle nada.
 * Este banner checa activamente (al abrir la app y cada vez que vuelve de
 * segundo plano), descarga la actualizacion si hay una, y deja reiniciar
 * de inmediato con un boton en vez de esperar a que la persona cierre la
 * app por casualidad.
 */
export default function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const checking = useRef(false);

  const checkForUpdate = useCallback(async () => {
    if (__DEV__ || !Updates.isEnabled || checking.current) return;
    checking.current = true;
    try {
      const check = await Updates.checkForUpdateAsync();
      if (check.isAvailable) {
        await Updates.fetchUpdateAsync();
        setReady(true);
      }
    } catch (e) {
      // Silencioso: sin internet o servidor caido -- se reintenta la
      // proxima vez que la app pase a primer plano.
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    checkForUpdate();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkForUpdate();
    });
    return () => sub.remove();
  }, [checkForUpdate]);

  const restart = async () => {
    setRestarting(true);
    try {
      await Updates.reloadAsync();
    } catch (e) {
      setRestarting(false);
    }
  };

  if (!ready) return null;

  return (
    <View style={[styles.wrap, shadow.card]} pointerEvents="box-none">
      <View style={styles.banner}>
        <Ionicons name="cloud-download-outline" size={18} color={colors.teal} />
        <Text style={styles.text}>Hay una actualización disponible</Text>
        <Pressable style={styles.btn} onPress={restart} disabled={restarting} hitSlop={8}>
          <Text style={styles.btnText}>{restarting ? 'Reiniciando…' : 'Reiniciar'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 18,
    zIndex: 999,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  text: { flex: 1, color: '#fff', fontSize: 12.5, fontWeight: '600' },
  btn: {
    backgroundColor: colors.teal,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  btnText: { color: '#06322f', fontWeight: '800', fontSize: 12 },
});
