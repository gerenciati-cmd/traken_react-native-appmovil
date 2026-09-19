import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, gradients, radii, shadow } from '../theme/colors';
import { getNotifications, NotificationItem } from '../api/client';
import { markNotificationsSeen } from '../utils/notificationsSeen';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

type EventInfo = { icon: keyof typeof Ionicons.glyphMap; color: string };

const EVENT_INFO: Record<string, EventInfo> = {
  os_creada: { icon: 'document-text-outline', color: '#2563eb' },
  os_cerrada: { icon: 'lock-closed-outline', color: '#16a34a' },
  os_cancelada: { icon: 'close-circle-outline', color: '#dc2626' },
  pax_agregado: { icon: 'person-add-outline', color: '#0891b2' },
  pax_editado: { icon: 'create-outline', color: '#d97706' },
  transporte_agregado: { icon: 'car-outline', color: '#7c3aed' },
};
const DEFAULT_EVENT_INFO: EventInfo = { icon: 'notifications-outline', color: '#64748b' };

function timeAgo(dateStr: string): string {
  const ts = Date.parse(dateStr.replace(' ', 'T'));
  if (isNaN(ts)) return dateStr;
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  const d = new Date(ts);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

/**
 * Bandeja de notificaciones -- lee el historial que ya guarda
 * aps_push_notify_station() (op/include/pushNotify.php) cada vez que se
 * crea/cierra/cancela una O.S. o se agrega/edita un pax/transporte de tus
 * estaciones. Sirve como bitacora aunque el push remoto todavia no llegue a
 * este telefono (Expo Go en Android no lo soporta -- hace falta una build
 * compilada), y va a seguir siendo la misma pantalla el dia que si llegue.
 */
export default function NotificationsScreen({ navigation }: Props) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (pageToLoad: number, replace: boolean) => {
    if (replace) setIsLoading(true);
    else setIsLoadingMore(true);
    setError(null);
    try {
      const res = await getNotifications(pageToLoad);
      if (res.ok) {
        setItems((prev) => (replace ? res.items ?? [] : [...prev, ...(res.items ?? [])]));
        setHasMore(!!res.has_more);
        setPage(pageToLoad);
      } else {
        setError(res.error ?? 'No se pudo cargar tus notificaciones.');
      }
    } catch (e) {
      setError('Sin conexión. Revisa tu internet e intenta de nuevo.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(1, true);
    markNotificationsSeen();
  }, [load]);

  return (
    <LinearGradient colors={gradients.hero} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.topTitle}>Notificaciones</Text>
          <View style={styles.backBtn} />
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => load(1, true)}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it) => String(it.id)}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="notifications-off-outline" size={28} color={colors.textMuted} />
                <Text style={styles.emptyText}>Aún no tienes notificaciones.</Text>
                <Text style={styles.emptySub}>
                  Aquí aparecerán las O.S. y pasajeros que se creen o cambien en tus estaciones.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const info = (item.evento && EVENT_INFO[item.evento]) || DEFAULT_EVENT_INFO;
              return (
                <View style={[styles.card, shadow.card]}>
                  <View style={[styles.iconWrap, { backgroundColor: info.color }]}>
                    <Ionicons name={info.icon} size={18} color="#fff" />
                  </View>
                  <View style={styles.cardMain}>
                    <View style={styles.cardTopRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.titulo}</Text>
                      {item.iata ? (
                        <View style={styles.iataBadge}>
                          <Text style={styles.iataText}>{item.iata}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.cardBody} numberOfLines={2}>{item.cuerpo}</Text>
                    <Text style={styles.cardTime}>{timeAgo(item.sent_at)}</Text>
                  </View>
                </View>
              );
            }}
            ListFooterComponent={
              hasMore ? (
                <Pressable
                  style={styles.moreBtn}
                  onPress={() => !isLoadingMore && load(page + 1, false)}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <ActivityIndicator color={colors.teal} />
                  ) : (
                    <Text style={styles.moreBtnText}>Cargar más</Text>
                  )}
                </Pressable>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: colors.white, fontSize: 15, fontWeight: '800' },
  errorBox: { alignItems: 'center', gap: 10, padding: 30 },
  errorText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.teal, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 18 },
  retryText: { color: '#06322f', fontWeight: '800', fontSize: 13 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 8, paddingHorizontal: 30 },
  emptyText: { color: colors.text, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  emptySub: { color: colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 17 },
  card: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 13,
    marginBottom: 10,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cardMain: { flex: 1 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { color: colors.white, fontWeight: '800', fontSize: 13, flexShrink: 1 },
  iataBadge: { backgroundColor: colors.navy3, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  iataText: { color: colors.white, fontSize: 9.5, fontWeight: '800' },
  cardBody: { color: colors.textMuted, fontSize: 12, marginTop: 3, lineHeight: 16 },
  cardTime: { color: colors.textMuted, fontSize: 10, marginTop: 5, fontWeight: '600' },
  moreBtn: { alignItems: 'center', paddingVertical: 16 },
  moreBtnText: { color: colors.teal, fontWeight: '800', fontSize: 13 },
});
