import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, gradients, radii, shadow } from '../theme/colors';
import { getLiveFlights, LiveFlightAirport, LiveFlightRow } from '../api/client';
import { getCache, saveCache } from '../utils/offlineCache';
import { formatSavedAt } from '../utils/useOfflineLoad';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Vuelos'>;

const CACHE_KEY = 'live_flights';
const REFRESH_MS = 90000;

function faseInfo(fase: string): { color: string; label: string } {
  if (fase === 'descenso') return { color: '#22c55e', label: 'Descendiendo' };
  if (fase === 'ascenso') return { color: '#60a5fa', label: 'Ascendiendo' };
  return { color: '#94a3b8', label: 'Nivel' };
}

/**
 * Equivalente movil (solo Lista -- la Vista Mapa con Leaflet de la web queda
 * pendiente) del radar "Vuelos en Tiempo Real" embebido en el dashboard de
 * op/modulos/inicio/inicio.php. Datos de OpenSky Network via
 * op/api/orders/liveFlights.php (mismo cache en disco que usa la web).
 */
export default function VuelosScreen({ navigation }: Props) {
  const [airports, setAirports] = useState<LiveFlightAirport[]>([]);
  const [active, setActive] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineSince, setOfflineSince] = useState<number | null>(null);
  const [detail, setDetail] = useState<LiveFlightRow | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const res = await getLiveFlights();
      if (res.ok) {
        const list = res.airports ?? [];
        setAirports(list);
        setOfflineSince(null);
        await saveCache(CACHE_KEY, list);
      } else {
        setError(res.error ?? 'No se pudo cargar el radar.');
      }
    } catch (e) {
      const cached = await getCache<LiveFlightAirport[]>(CACHE_KEY);
      if (cached) {
        setAirports(cached.data);
        setOfflineSince(cached.savedAt);
      } else {
        setError('Sin conexión con el radar y sin datos guardados todavía.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(() => load(true), REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  const ap = airports[active];

  return (
    <LinearGradient colors={gradients.hero} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <View>
            <Text style={styles.topTitle}>Vuelos en Tiempo Real</Text>
            <Text style={styles.topSub}>Fuente: OpenSky Network</Text>
          </View>
          <Pressable style={styles.backBtn} onPress={() => load(true)} hitSlop={10} disabled={isRefreshing}>
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="refresh" size={20} color={colors.white} />
            )}
          </Pressable>
        </View>

        {offlineSince && (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={16} color="#fde68a" />
            <Text style={styles.offlineBannerText}>
              Sin conexión: mostrando lo guardado el {formatSavedAt(offlineSince)}.
            </Text>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => load()}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : airports.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="airplane-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyText}>No tienes aeropuertos asignados.</Text>
          </View>
        ) : (
          <>
            {airports.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
                {airports.map((a, i) => (
                  <Pressable
                    key={a.iata}
                    style={[styles.tab, i === active && styles.tabActive]}
                    onPress={() => setActive(i)}
                  >
                    <Text style={[styles.tabText, i === active && styles.tabTextActive]}>{a.iata}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            <ScrollView contentContainerStyle={styles.content}>
              {ap?.unsupported ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="radio-outline" size={26} color={colors.textMuted} />
                  <Text style={styles.emptyText}>Rastreo no disponible todavía para {ap.iata}.</Text>
                </View>
              ) : !ap?.live?.length ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="airplane-outline" size={26} color={colors.textMuted} />
                  <Text style={styles.emptyText}>Sin aeronaves detectadas cerca en este momento.</Text>
                </View>
              ) : (
                ap.live.map((r, idx) => {
                  const f = faseInfo(r.fase);
                  const meta = [
                    r.dist_km != null ? `${r.dist_km} km` : null,
                    r.alt_ft != null ? `${r.alt_ft.toLocaleString()} ft` : null,
                    r.speed_kmh != null ? `${r.speed_kmh} km/h` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <Pressable
                      key={idx}
                      style={[styles.card, shadow.card, r.mi_os && styles.cardMio]}
                      onPress={() => setDetail(r)}
                    >
                      <View style={[styles.planeIcon, { transform: [{ rotate: `${r.track_deg ?? 0}deg` }] }]}>
                        <Ionicons name="airplane" size={18} color={colors.white} />
                      </View>
                      <View style={styles.cardMain}>
                        <View style={styles.cardTitleRow}>
                          <Text style={styles.cardAirline} numberOfLines={1}>
                            {r.airline || r.callsign || '---'}
                          </Text>
                          {r.mi_os && (
                            <View style={styles.mioBadge}>
                              <Text style={styles.mioBadgeText}>★ {r.mi_os_folio}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.cardCallsign}>{r.callsign || '---'}</Text>
                        <Text style={styles.cardMeta}>{meta}</Text>
                      </View>
                      <View style={[styles.faseBadge, { backgroundColor: f.color + '33' }]}>
                        <Text style={[styles.faseBadgeText, { color: f.color }]}>{f.label}</Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
              <Text style={styles.footNote}>
                Posición aproximada por ADS-B (OpenSky Network). Se actualiza solo cada 90 segundos.
              </Text>
            </ScrollView>
          </>
        )}
      </SafeAreaView>

      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDetail(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {detail && (
              <>
                <View style={styles.modalHead}>
                  <Text style={styles.modalAirline}>{detail.airline || 'Aeronave sin identificar'}</Text>
                  <Pressable onPress={() => setDetail(null)} hitSlop={10}>
                    <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                  </Pressable>
                </View>
                <Text style={styles.modalCall}>
                  Indicativo: {detail.callsign || '---'}
                  {detail.icao24 ? ` · Transpondedor ${detail.icao24}` : ''}
                </Text>
                <View style={styles.modalGrid}>
                  {detail.mi_os && <DetailItem label="Tu O.S." value={detail.mi_os_folio ?? ''} />}
                  <DetailItem label="Distancia" value={detail.dist_km != null ? `${detail.dist_km} km` : '—'} />
                  <DetailItem
                    label="Dirección"
                    value={detail.rumbo ? `${detail.rumbo}${detail.bearing != null ? ` (${detail.bearing}°)` : ''}` : '—'}
                  />
                  <DetailItem
                    label="Altitud"
                    value={detail.alt_ft != null ? `${detail.alt_ft.toLocaleString()} ft` : '—'}
                  />
                  <DetailItem
                    label="Velocidad"
                    value={detail.speed_kmh != null ? `${detail.speed_kmh} km/h` : '—'}
                  />
                  <DetailItem label="País de matrícula" value={detail.origen ?? '—'} />
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
  topSub: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 1 },
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
  offlineBannerText: { color: '#fde68a', fontSize: 11.5, flexShrink: 1, lineHeight: 16 },
  errorBox: { alignItems: 'center', gap: 10, padding: 30 },
  errorText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.teal, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 18 },
  retryText: { color: '#06322f', fontWeight: '800', fontSize: 13 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  tabsRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  tab: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  tabActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  tabText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  tabTextActive: { color: '#06322f' },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 13,
    marginBottom: 10,
  },
  cardMio: { borderColor: 'rgba(250,204,21,0.5)', backgroundColor: 'rgba(250,204,21,0.08)' },
  planeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.navy3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMain: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardAirline: { color: colors.white, fontWeight: '800', fontSize: 13, flexShrink: 1 },
  cardCallsign: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  cardMeta: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  mioBadge: { backgroundColor: 'rgba(250,204,21,0.25)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  mioBadgeText: { color: '#fde047', fontSize: 9.5, fontWeight: '900' },
  faseBadge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  faseBadgeText: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase' },
  footNote: { color: colors.textMuted, fontSize: 10.5, textAlign: 'center', marginTop: 8, lineHeight: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 18, width: '100%', maxWidth: 400, padding: 20 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalAirline: { fontSize: 16, fontWeight: '900', color: '#0f172a', flexShrink: 1 },
  modalCall: { fontSize: 12, color: '#64748b', fontWeight: '700', marginBottom: 14 },
  modalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailItem: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, minWidth: '46%', flexGrow: 1 },
  detailLabel: { fontSize: 9.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700', marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
});
