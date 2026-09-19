import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, gradients, radii, shadow } from '../theme/colors';
import { getResumenEstacion, ResumenRow, ResumenTotales } from '../api/client';
import { getCache, saveCache } from '../utils/offlineCache';
import { formatSavedAt } from '../utils/useOfflineLoad';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Resumen'>;

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function currentPeriodo(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftPeriodo(periodo: string, delta: number): string {
  const [y, m] = periodo.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Equivalente movil de op/modulos/resumen/inicio.php: operaciones,
 * habitaciones y pasajeros por estacion en el mes elegido. Solo lectura.
 */
export default function ResumenScreen({ navigation }: Props) {
  const [periodo, setPeriodo] = useState(currentPeriodo());
  const [rows, setRows] = useState<ResumenRow[]>([]);
  const [totales, setTotales] = useState<ResumenTotales | null>(null);
  const [mesLabel, setMesLabel] = useState('');
  const [esAdminGeneral, setEsAdminGeneral] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineSince, setOfflineSince] = useState<number | null>(null);

  const cacheKey = `resumen_${periodo}`;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getResumenEstacion(periodo);
      if (res.ok) {
        setRows(res.rows ?? []);
        setTotales(res.totales ?? null);
        setMesLabel(res.mes_label ?? '');
        setEsAdminGeneral(!!res.es_admin_general);
        setOfflineSince(null);
        await saveCache(cacheKey, {
          rows: res.rows ?? [],
          totales: res.totales ?? null,
          mesLabel: res.mes_label ?? '',
          esAdminGeneral: !!res.es_admin_general,
        });
      } else {
        setError(res.error ?? 'No se pudo cargar el resumen.');
      }
    } catch (e) {
      const cached = await getCache<{
        rows: ResumenRow[];
        totales: ResumenTotales | null;
        mesLabel: string;
        esAdminGeneral: boolean;
      }>(cacheKey);
      if (cached) {
        setRows(cached.data.rows);
        setTotales(cached.data.totales);
        setMesLabel(cached.data.mesLabel);
        setEsAdminGeneral(cached.data.esAdminGeneral);
        setOfflineSince(cached.savedAt);
      } else {
        setError('Sin conexión y sin datos guardados todavía.');
      }
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  useEffect(() => {
    load();
  }, [load]);

  const isCurrentMonth = periodo === currentPeriodo();

  return (
    <LinearGradient colors={gradients.hero} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.topTitle}>Resumen por Estación</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {offlineSince && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={16} color="#fde68a" />
              <Text style={styles.offlineBannerText}>
                Sin conexión: mostrando lo guardado el {formatSavedAt(offlineSince)}.
              </Text>
            </View>
          )}

          <View style={styles.periodRow}>
            <Pressable style={styles.periodBtn} onPress={() => setPeriodo((p) => shiftPeriodo(p, -1))} hitSlop={8}>
              <Ionicons name="chevron-back" size={18} color={colors.white} />
            </Pressable>
            <View style={styles.periodLabelWrap}>
              <Text style={styles.periodLabel}>{mesLabel || periodo}</Text>
              {!isCurrentMonth && (
                <Pressable onPress={() => setPeriodo(currentPeriodo())}>
                  <Text style={styles.periodToday}>Volver al mes actual</Text>
                </Pressable>
              )}
            </View>
            <Pressable style={styles.periodBtn} onPress={() => setPeriodo((p) => shiftPeriodo(p, 1))} hitSlop={8}>
              <Ionicons name="chevron-forward" size={18} color={colors.white} />
            </Pressable>
          </View>

          {esAdminGeneral && (
            <Text style={styles.adminNote}>Vista de administrador: todas las estaciones.</Text>
          )}

          {isLoading ? (
            <ActivityIndicator color={colors.teal} style={{ marginTop: 30 }} />
          ) : error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={load}>
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : rows.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="bar-chart-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptyText}>Sin operaciones registradas en {mesLabel || 'este mes'}.</Text>
            </View>
          ) : (
            <>
              {rows.map((r) => (
                <View key={r.iata} style={[styles.card, shadow.card]}>
                  <View style={styles.cardHead}>
                    <View style={styles.iataBadge}>
                      <Text style={styles.iataText}>{r.iata}</Text>
                    </View>
                    <Text style={styles.airportName} numberOfLines={1}>{r.airportName}</Text>
                  </View>
                  <View style={styles.statsRow}>
                    <Stat label="Operac." value={r.operaciones} />
                    <Stat label="Hab." value={r.habitaciones} />
                    <Stat label="Adultos" value={r.adultos} />
                    <Stat label="Menores" value={r.menores} />
                    <Stat label="Infantes" value={r.infantes} />
                  </View>
                </View>
              ))}

              {totales && (
                <View style={[styles.card, styles.totalCard]}>
                  <Text style={styles.totalLabel}>TOTAL</Text>
                  <View style={styles.statsRow}>
                    <Stat label="Operac." value={totales.operaciones} light />
                    <Stat label="Hab." value={totales.habitaciones} light />
                    <Stat label="Adultos" value={totales.adultos} light />
                    <Stat label="Menores" value={totales.menores} light />
                    <Stat label="Infantes" value={totales.infantes} light />
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Stat({ label, value, light }: { label: string; value: number; light?: boolean }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, light && styles.statValueLight]}>{value}</Text>
      <Text style={[styles.statLabel, light && styles.statLabelLight]}>{label}</Text>
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
  topTitle: { color: colors.white, fontSize: 15, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 40 },
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
    marginBottom: 14,
  },
  offlineBannerText: { color: '#fde68a', fontSize: 11.5, flexShrink: 1, lineHeight: 16 },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  periodBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodLabelWrap: { alignItems: 'center', flex: 1 },
  periodLabel: { color: colors.white, fontWeight: '800', fontSize: 15, textTransform: 'capitalize' },
  periodToday: { color: colors.teal, fontSize: 11, fontWeight: '700', marginTop: 3 },
  adminNote: { color: colors.textMuted, fontSize: 11.5, textAlign: 'center', marginBottom: 14, marginTop: 4 },
  errorBox: { alignItems: 'center', gap: 10, padding: 30 },
  errorText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.teal, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 18 },
  retryText: { color: '#06322f', fontWeight: '800', fontSize: 13 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  card: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 14,
    marginTop: 14,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  iataBadge: { backgroundColor: colors.teal, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  iataText: { color: '#06322f', fontWeight: '900', fontSize: 12 },
  airportName: { color: colors.white, fontWeight: '700', fontSize: 13, flex: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { color: colors.white, fontWeight: '900', fontSize: 16 },
  statValueLight: { color: '#fff' },
  statLabel: { color: colors.textMuted, fontSize: 9.5, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  statLabelLight: { color: 'rgba(255,255,255,0.75)' },
  totalCard: { backgroundColor: colors.navy3, borderColor: colors.navy3, marginBottom: 6 },
  totalLabel: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 1, marginBottom: 10, textAlign: 'center' },
});
