import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
import { AuditLogItem, AuditOrigen, getAuditLog } from '../api/client';
import { getCache, saveCache } from '../utils/offlineCache';
import { formatSavedAt } from '../utils/useOfflineLoad';
import type { RootStackParamList } from '../navigation/RootNavigator';

const BITACORA_CACHE_KEY = 'bitacora_page1';

type Props = NativeStackScreenProps<RootStackParamList, 'Bitacora'>;

function accionColor(accion: string): string {
  const a = accion.toLowerCase();
  if (a.indexOf('crear') === 0 || a === 'crear') return '#16a34a';
  if (a.indexOf('eliminar') === 0 || a.indexOf('cancelar') === 0) return '#dc2626';
  if (a.indexOf('sync') === 0) return '#2563eb';
  if (a.indexOf('archivo') === 0) return '#7c3aed';
  return '#0891b2';
}

function formatFecha(f: string): string {
  const ts = Date.parse(f.replace(' ', 'T'));
  if (isNaN(ts)) return f;
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ORIGIN_FILTERS: { key: AuditOrigen | ''; label: string }[] = [
  { key: '', label: 'Todos' },
  { key: 'movil', label: '📱 Móvil' },
  { key: 'web', label: '💻 Web' },
];

/**
 * Bitacora/Auditoria en el movil -- equivalente de admin/modulos/auditoria/
 * (protegida con PIN en la web), pero SOLO visible/accesible para el admin
 * maestro (ver HomeScreen: el tile ni siquiera aparece para otras cuentas,
 * y el backend vuelve a exigir esa cuenta exacta por su cuenta). Pensada
 * para revisar desde el celular qué se hizo -- especialmente qué vino de la
 * app movil, marcado con el badge 📱 Móvil en cada renglón.
 */
export default function BitacoraScreen({ navigation }: Props) {
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [origen, setOrigen] = useState<AuditOrigen | ''>('');
  const [query, setQuery] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineSince, setOfflineSince] = useState<number | null>(null);

  const load = useCallback(async (pageToLoad: number, replace: boolean) => {
    if (replace) setIsLoading(true);
    else setIsLoadingMore(true);
    setError(null);
    const isDefaultFirstPage = pageToLoad === 1 && !origen && !query.trim();
    try {
      const res = await getAuditLog({
        page: pageToLoad,
        origen: origen || undefined,
        q: query.trim() || undefined,
      });
      if (res.ok) {
        const nextItems = res.items ?? [];
        setItems((prev) => (replace ? nextItems : [...prev, ...nextItems]));
        setHasMore(!!res.has_more);
        setTotal(res.total ?? 0);
        setPage(pageToLoad);
        setOfflineSince(null);
        // Solo se guarda la "primera pagina, sin filtros" -- es la unica
        // vista que tiene sentido recordar para revisarla sin señal.
        if (isDefaultFirstPage) {
          await saveCache(BITACORA_CACHE_KEY, { items: nextItems, total: res.total ?? 0 });
        }
      } else {
        setError(res.error ?? 'No se pudo cargar la bitácora.');
        if (replace) setItems([]);
      }
    } catch (e) {
      if (isDefaultFirstPage) {
        const cached = await getCache<{ items: AuditLogItem[]; total: number }>(BITACORA_CACHE_KEY);
        if (cached) {
          setItems(cached.data.items);
          setTotal(cached.data.total);
          setHasMore(false);
          setPage(1);
          setOfflineSince(cached.savedAt);
        } else {
          setError('Sin conexión y sin datos guardados todavía.');
          if (replace) setItems([]);
        }
      } else {
        setError('Sin conexión. Revisa tu internet e intenta de nuevo.');
        if (replace) setItems([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [origen, query]);

  useEffect(() => {
    load(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origen]);

  const runSearch = () => load(1, true);
  const loadMore = () => {
    if (!isLoadingMore && hasMore) load(page + 1, false);
  };

  return (
    <LinearGradient colors={gradients.hero} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <View>
            <Text style={styles.topTitle}>Bitácora</Text>
            <Text style={styles.topSub}>{total} evento{total === 1 ? '' : 's'}</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.filtersWrap}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={runSearch}
              placeholder="Buscar folio, detalle, usuario..."
              placeholderTextColor={colors.placeholder}
              style={styles.searchInput}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => { setQuery(''); load(1, true); }} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          <View style={styles.chipRow}>
            {ORIGIN_FILTERS.map((f) => (
              <Pressable
                key={f.key || 'todos'}
                style={[styles.chip, origen === f.key && styles.chipActive]}
                onPress={() => setOrigen(f.key)}
              >
                <Text style={[styles.chipText, origen === f.key && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 30 }} />
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
            keyExtractor={(ev) => String(ev.id)}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              offlineSince ? (
                <View style={styles.offlineBanner}>
                  <Ionicons name="cloud-offline-outline" size={16} color="#fde68a" />
                  <Text style={styles.offlineBannerText}>
                    Sin conexión: mostrando lo guardado el {formatSavedAt(offlineSince)}.
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="file-tray-outline" size={28} color={colors.textMuted} />
                <Text style={styles.emptyText}>
                  {query || origen ? 'Sin eventos para estos filtros.' : 'Aún no hay eventos registrados.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={[styles.card, shadow.card]}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardFecha}>{formatFecha(item.fecha)}</Text>
                  <View
                    style={[
                      styles.origenBadge,
                      item.origen === 'movil' ? styles.origenBadgeMovil : styles.origenBadgeWeb,
                    ]}
                  >
                    <Text style={styles.origenBadgeText}>{item.origen === 'movil' ? '📱 Móvil' : '💻 Web'}</Text>
                  </View>
                </View>
                <View style={styles.cardMidRow}>
                  <View style={[styles.accionPill, { backgroundColor: accionColor(item.accion) }]}>
                    <Text style={styles.accionPillText}>{item.accion}</Text>
                  </View>
                  {!!item.modulo && (
                    <View style={styles.moduloPill}>
                      <Text style={styles.moduloPillText}>{item.modulo}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardRef}>
                  {item.referencia || (item.registro_id ? '#' + item.registro_id : '')}
                </Text>
                {!!item.usuario && <Text style={styles.cardUsuario}>{item.usuario}</Text>}
                {!!item.detalle && <Text style={styles.cardDetalle}>{item.detalle}</Text>}
              </View>
            )}
            ListFooterComponent={
              hasMore ? (
                <Pressable style={styles.moreBtn} onPress={loadMore} disabled={isLoadingMore}>
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
  topTitle: { color: colors.white, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  topSub: { color: colors.textMuted, fontSize: 11.5, textAlign: 'center', marginTop: 1 },
  filtersWrap: { paddingHorizontal: 16, marginBottom: 8, gap: 10 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.inputBg,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#06322f' },
  errorBox: { alignItems: 'center', gap: 10, padding: 30 },
  errorText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.teal, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 18 },
  retryText: { color: '#06322f', fontWeight: '800', fontSize: 13 },
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
    marginBottom: 10,
  },
  offlineBannerText: { color: '#fde68a', fontSize: 11.5, flexShrink: 1, lineHeight: 16 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  card: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 13,
    marginBottom: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardFecha: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  origenBadge: { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  origenBadgeMovil: { backgroundColor: 'rgba(99,102,241,0.22)' },
  origenBadgeWeb: { backgroundColor: 'rgba(148,163,184,0.22)' },
  origenBadgeText: { color: colors.white, fontSize: 10.5, fontWeight: '800' },
  cardMidRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  accionPill: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 9 },
  accionPillText: { color: '#fff', fontSize: 10.5, fontWeight: '800' },
  moduloPill: { backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 9 },
  moduloPillText: { color: colors.text, fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase' },
  cardRef: { color: colors.white, fontSize: 13.5, fontWeight: '700', marginBottom: 2 },
  cardUsuario: { color: colors.teal, fontSize: 11.5, fontWeight: '700', marginBottom: 4 },
  cardDetalle: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  moreBtn: { alignItems: 'center', paddingVertical: 16 },
  moreBtnText: { color: colors.teal, fontWeight: '800', fontSize: 13 },
});
