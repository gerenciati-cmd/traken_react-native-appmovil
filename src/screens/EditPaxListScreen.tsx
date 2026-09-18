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
import { ExistingPaxDTO, getOrderPax } from '../api/client';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'EditPaxList'>;

/**
 * Lista + buscador de pasajeros ya registrados en la O.S. -- equivalente
 * "modo movil" del boton "Editar" que en la web abre op/modulos/open/edit.php
 * (un formulario gigante con TODOS los pasajeros de la orden a la vez).
 * En ordenes reales con decenas o cientos de pasajeros esa pantalla no
 * tiene sentido en un celular, asi que aqui se busca a la persona y se
 * edita una por una (EditPaxScreen).
 */
export default function EditPaxListScreen({ route, navigation }: Props) {
  const { folio, idAirport, folioDisplay, iata, typeAirline } = route.params;

  const [items, setItems] = useState<ExistingPaxDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getOrderPax(folio, idAirport);
      if (res.ok) setItems(res.items ?? []);
      else setError(res.error ?? 'No se pudo cargar la lista.');
    } catch (e) {
      setError('Sin conexión. Revisa tu internet e intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [folio, idAirport]);

  useEffect(() => {
    load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((p) => p.name.toLowerCase().includes(q)) : items;

  return (
    <LinearGradient colors={gradients.hero} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <View>
            <Text style={styles.topTitle}>Editar Pasajero</Text>
            <Text style={styles.topSub}>#{folioDisplay}{iata ? ' · ' + iata : ''}</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nombre..."
            placeholderTextColor={colors.placeholder}
            style={styles.searchInput}
            autoCapitalize="none"
          />
        </View>

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
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(p) => String(p.id)}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="people-outline" size={26} color={colors.textMuted} />
                <Text style={styles.emptyText}>
                  {q ? 'Sin resultados para tu búsqueda.' : 'Esta O.S. no tiene pasajeros registrados.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.card, shadow.card]}
                onPress={() =>
                  navigation.navigate('EditPax', { folio, idAirport, folioDisplay, iata, typeAirline, pax: item })
                }
              >
                <View style={styles.cardIcon}>
                  <Ionicons name="person-outline" size={18} color="#fff" />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardSub}>{item.hotel_name.trim()} · {item.date_out}</Text>
                </View>
                <Ionicons
                  name={item.voucher_img_url ? 'checkmark-circle' : 'alert-circle-outline'}
                  size={16}
                  color={item.voucher_img_url ? '#22c55e' : '#f59e0b'}
                  style={{ marginRight: 4 }}
                />
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            )}
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
  errorBox: { alignItems: 'center', gap: 10, padding: 30 },
  errorText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.teal, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 18 },
  retryText: { color: '#06322f', fontWeight: '800', fontSize: 13 },
  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 12,
    marginBottom: 10,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.navy3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardName: { color: colors.white, fontWeight: '700', fontSize: 13.5 },
  cardSub: { color: colors.textMuted, fontSize: 11.5, marginTop: 2 },
});
