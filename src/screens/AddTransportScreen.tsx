import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { addTransport, getTransportOptions, NamedOption } from '../api/client';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTransport'>;

/**
 * Equivalente movil de op/modulos/open/transport.php (llegada) y
 * transport_s.php (salida) + insertTransportOrder(S).php -- mismo par de
 * pantallas de la web, unidas en una sola que recibe `direction` ('in' /
 * 'out') via route.params, igual que op/api/orders/addTransport.php unio
 * los 2 endpoints del lado del servidor.
 */
export default function AddTransportScreen({ route, navigation }: Props) {
  const { folio, idAirport, folioDisplay, iata, direction } = route.params;

  const isArrival = direction === 'in';

  const [hotels, setHotels] = useState<NamedOption[]>([]);
  const [transports, setTransports] = useState<NamedOption[]>([]);
  const [units, setUnits] = useState<NamedOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [idHotel, setIdHotel] = useState<number | null>(null);
  const [idTransport, setIdTransport] = useState<number | null>(null);
  const [unit, setUnit] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [pax, setPax] = useState('1');
  const [transportQuery, setTransportQuery] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await getTransportOptions(folio, idAirport);
      if (res.ok) {
        const hs = res.hotels ?? [];
        setHotels(hs);
        setTransports(res.transports ?? []);
        setUnits(res.units ?? []);
        if (hs.length === 1) setIdHotel(hs[0].id);
      } else {
        setLoadError(res.error ?? 'No se pudo cargar la información.');
      }
    } catch (e) {
      setLoadError('Sin conexión. Revisa tu internet e intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [folio, idAirport]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredTransports = transportQuery.trim()
    ? transports.filter((t) => t.name.toLowerCase().includes(transportQuery.trim().toLowerCase()))
    : transports;

  const qty = parseInt(quantity, 10) || 0;
  const paxNum = parseInt(pax, 10) || 0;

  const canSubmit = !!idHotel && !!idTransport && !!unit && qty > 0 && paxNum > 0 && !isSaving;

  const handleSubmit = async () => {
    if (!canSubmit || !idHotel || !idTransport || !unit) return;
    setIsSaving(true);
    try {
      const res = await addTransport({
        id_order: folio,
        id_airport: idAirport,
        id_hotel: idHotel,
        id_transport: idTransport,
        unit,
        quantity: qty,
        pax: paxNum,
        direction,
      });

      if (!res.ok) {
        Alert.alert('No se pudo guardar', res.error ?? res.msg ?? 'Intenta de nuevo.');
        return;
      }

      Alert.alert('Transporte agregado', res.msg ?? '', [
        { text: 'Terminar', style: 'cancel', onPress: () => navigation.navigate('OpenOrders') },
        {
          text: 'Agregar otro',
          onPress: () => {
            setIdTransport(null);
            setUnit(null);
            setQuantity('1');
            setPax('1');
          },
        },
      ]);
    } catch (e) {
      Alert.alert('Sin conexión', 'No se pudo guardar. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
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
            <Text style={styles.topTitle}>Transporte de {isArrival ? 'Llegada' : 'Salida'}</Text>
            <Text style={styles.topSub}>#{folioDisplay}{iata ? ' · ' + iata : ''}</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        ) : loadError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <FieldLabel text="Hotel" />
              {hotels.length === 0 ? (
                <Text style={styles.noRooms}>Esta O.S. no tiene hoteles asignados.</Text>
              ) : (
                <ChipRow>
                  {hotels.map((h) => (
                    <Chip key={h.id} label={h.name.trim()} active={idHotel === h.id} onPress={() => setIdHotel(h.id)} />
                  ))}
                </ChipRow>
              )}

              <FieldLabel text="Transportadora" />
              <TextInput
                value={transportQuery}
                onChangeText={setTransportQuery}
                placeholder="Buscar transportadora..."
                placeholderTextColor={colors.placeholder}
                style={styles.input}
                autoCapitalize="none"
              />
              <View style={styles.transportListWrap}>
                <ChipRow>
                  {filteredTransports.slice(0, 40).map((t) => (
                    <Chip key={t.id} label={t.name} active={idTransport === t.id} onPress={() => setIdTransport(t.id)} />
                  ))}
                  {filteredTransports.length === 0 && (
                    <Text style={styles.noRooms}>Sin resultados.</Text>
                  )}
                </ChipRow>
              </View>

              <FieldLabel text="Tipo de unidad" />
              <ChipRow>
                {units.map((u) => (
                  <Chip key={u.id} label={u.name.trim()} active={unit === u.id} onPress={() => setUnit(u.id)} />
                ))}
              </ChipRow>

              <View style={styles.row2}>
                <View style={styles.row2Item}>
                  <FieldLabel text="Cantidad de unidades" />
                  <TextInput
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </View>
                <View style={styles.row2Item}>
                  <FieldLabel text="Pax" />
                  <TextInput
                    value={pax}
                    onChangeText={setPax}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </View>
              </View>

              <Pressable
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                <Text style={styles.submitText}>{isSaving ? 'Guardando...' : 'Guardar Transporte'}</Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.fieldLabel}>{text}</Text>;
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
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
  content: { padding: 16, paddingBottom: 40 },
  errorBox: { alignItems: 'center', gap: 10, padding: 30 },
  errorText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  retryBtn: { backgroundColor: colors.teal, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 18 },
  retryText: { color: '#06322f', fontWeight: '800', fontSize: 13 },
  noRooms: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    height: 46,
    color: colors.text,
    fontSize: 14,
  },
  transportListWrap: { marginTop: 10, maxHeight: 220 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { color: colors.text, fontSize: 12.5, fontWeight: '700' },
  chipTextActive: { color: '#06322f' },
  row2: { flexDirection: 'row', gap: 12 },
  row2Item: { flex: 1 },
  submitBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.button,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#06322f', fontWeight: '800', fontSize: 15 },
});
