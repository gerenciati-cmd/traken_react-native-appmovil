import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, gradients, radii, shadow } from '../theme/colors';
import { getOpenOrders, OpenOrderDTO } from '../api/client';
import { getCache, saveCache } from '../utils/offlineCache';
import CommentsModal from '../components/CommentsModal';
import QrEncuestaModal from '../components/QrEncuestaModal';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'OpenOrders'>;

const CACHE_KEY = 'open_orders';
type CachedOrders = { orders: OpenOrderDTO[]; totalAnteriores: number };

function formatSavedAt(ms: number) {
  const d = new Date(ms);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) +
    ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export default function OpenOrdersScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<OpenOrderDTO[]>([]);
  const [totalAnteriores, setTotalAnteriores] = useState(0);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineSince, setOfflineSince] = useState<number | null>(null);
  const [qrOrder, setQrOrder] = useState<OpenOrderDTO | null>(null);
  const [commentsOrder, setCommentsOrder] = useState<OpenOrderDTO | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const res = await getOpenOrders();
      if (res.ok) {
        const nextOrders = res.orders ?? [];
        const nextTotalAnteriores = res.total_anteriores ?? 0;
        setOrders(nextOrders);
        setTotalAnteriores(nextTotalAnteriores);
        setOfflineSince(null);
        await saveCache<CachedOrders>(CACHE_KEY, { orders: nextOrders, totalAnteriores: nextTotalAnteriores });
      } else {
        setError(res.error ?? 'No se pudo cargar la información.');
      }
    } catch (e) {
      // Sin señal: se muestra lo ultimo que se guardo (si hay), en vez de
      // dejar la pantalla vacia. Esto funciona igual en Expo Go que en un
      // build nativo real -- no depende de que la app sea PWA.
      const cached = await getCache<CachedOrders>(CACHE_KEY);
      if (cached) {
        setOrders(cached.data.orders);
        setTotalAnteriores(cached.data.totalAnteriores);
        setOfflineSince(cached.savedAt);
      } else {
        setError('Sin conexión y sin datos guardados todavía.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? orders.filter((o) =>
        `${o.folio_display} ${o.airline} ${o.flight ?? ''} ${o.iata}`.toLowerCase().includes(q)
      )
    : orders;

  return (
    <LinearGradient colors={gradients.hero} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <View>
            <Text style={styles.topTitle}>Órdenes Abiertas</Text>
            <Text style={styles.topSub}>{orders.length} activa(s) este año</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar folio, aerolínea o vuelo..."
            placeholderTextColor={colors.placeholder}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : offlineSince ? (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color="#fde68a" />
            <Text style={styles.offlineBannerText}>
              Sin conexión: mostrando lo guardado el {formatSavedAt(offlineSince)}
            </Text>
          </View>
        ) : null}

        <FlatList
          data={filtered}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} tintColor={colors.teal} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="file-tray-outline" size={28} color={colors.textMuted} />
                <Text style={styles.emptyText}>
                  {q ? 'Sin resultados para tu búsqueda.' : 'No tienes órdenes abiertas.'}
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            totalAnteriores > 0 ? (
              <View style={styles.oldBanner}>
                <Ionicons name="time-outline" size={15} color={colors.warn} />
                <Text style={styles.oldBannerText}>
                  {totalAnteriores} orden(es) de años anteriores (no se muestran aquí)
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={[styles.card, shadow.card]}>
              <View style={styles.cardTop}>
                <View style={styles.folioRow}>
                  <View style={styles.dot} />
                  <Text style={styles.folioText}>#{item.folio_display}</Text>
                </View>
                {item.iata ? (
                  <View style={styles.iataBadge}>
                    <Text style={styles.iataText}>{item.iata}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.rows}>
                <View style={styles.rowItem}>
                  <Ionicons name="airplane-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.rowText}>{item.airline}</Text>
                </View>
                {item.flight ? (
                  <View style={styles.rowItem}>
                    <Ionicons name="pricetag-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.rowText}>{item.flight.trim()}</Text>
                  </View>
                ) : null}
                {item.date_in ? (
                  <View style={styles.rowItem}>
                    <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.rowText}>{item.date_in}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionBtn, styles.actionAdd]}
                  onPress={() =>
                    navigation.navigate('OrderMenu', {
                      folio: item.folio,
                      idAirport: item.id_airport,
                      folioDisplay: item.folio_display,
                      iata: item.iata,
                    })
                  }
                >
                  <Ionicons name="add" size={14} color="#fff" />
                  <Text style={styles.actionText}>Agregar</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, styles.actionQr]} onPress={() => setQrOrder(item)}>
                  <Ionicons name="qr-code-outline" size={14} color="#4454c3" />
                  <Text style={[styles.actionText, styles.actionQrText]}>QR</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.actionDelay]}
                  onPress={() => navigation.navigate('ComingSoon', { title: 'Aviso de Retraso', icon: 'time-outline' })}
                >
                  <Ionicons name="time-outline" size={14} color="#fff" />
                  <Text style={styles.actionText}>Delay</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, styles.actionComments]} onPress={() => setCommentsOrder(item)}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color="#fff" />
                  <Text style={styles.actionText}>Comentarios</Text>
                </Pressable>
              </View>
            </View>
          )}
        />

        <QrEncuestaModal
          visible={!!qrOrder}
          onClose={() => setQrOrder(null)}
          folioDisplay={qrOrder?.folio_display ?? ''}
          iata={qrOrder?.iata ?? ''}
        />
        <CommentsModal
          visible={!!commentsOrder}
          onClose={() => setCommentsOrder(null)}
          idOrder={commentsOrder?.folio ?? 0}
          idAirport={commentsOrder?.id_airport ?? 0}
          folioDisplay={commentsOrder?.folio_display ?? ''}
        />
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
  topTitle: { color: colors.white, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  topSub: { color: colors.textMuted, fontSize: 11.5, textAlign: 'center', marginTop: 1 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.inputBg,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    height: 44,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(220,38,38,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.35)',
    borderRadius: radii.input,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  errorText: { color: '#ffb4bb', fontSize: 12.5, flexShrink: 1 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245,158,11,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    borderRadius: radii.input,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  offlineBannerText: { color: '#fde68a', fontSize: 12, flexShrink: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 30, gap: 10 },
  card: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  folioRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.teal },
  folioText: { color: colors.white, fontWeight: '800', fontSize: 13.5 },
  iataBadge: {
    backgroundColor: colors.navy3,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  iataText: { color: colors.white, fontSize: 10.5, fontWeight: '800' },
  rows: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowText: { color: colors.textMuted, fontSize: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 11,
  },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 11.5 },
  actionAdd: { backgroundColor: '#16a34a' },
  actionQr: { backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#dbe3ff' },
  actionQrText: { color: '#4454c3' },
  actionDelay: { backgroundColor: '#0891b2' },
  actionComments: { backgroundColor: '#d97706' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  oldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: radii.input,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  oldBannerText: { color: '#fde68a', fontSize: 11.5, flexShrink: 1 },
});
