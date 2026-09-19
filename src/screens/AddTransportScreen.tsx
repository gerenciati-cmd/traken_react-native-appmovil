import React, { useState } from 'react';
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
import { addTransport, getTransportOptions } from '../api/client';
import SelectField from '../components/SelectField';
import { useOfflineLoad, formatSavedAt } from '../utils/useOfflineLoad';
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

  const [isSaving, setIsSaving] = useState(false);

  const [idHotel, setIdHotel] = useState<number | null>(null);
  const [idTransport, setIdTransport] = useState<number | null>(null);
  const [unit, setUnit] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [pax, setPax] = useState('1');

  const {
    data: options,
    isLoading,
    error: loadError,
    offlineSince,
    reload: load,
  } = useOfflineLoad(
    `add_transport_options_${folio}_${idAirport}`,
    () => getTransportOptions(folio, idAirport),
    (res) => ({ hotels: res.hotels ?? [], transports: res.transports ?? [], units: res.units ?? [] }),
    [folio, idAirport]
  );

  const hotels = options?.hotels ?? [];
  const transports = options?.transports ?? [];
  const units = options?.units ?? [];

  React.useEffect(() => {
    if (options?.hotels.length === 1) setIdHotel(options.hotels[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

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
              {offlineSince && (
                <View style={styles.offlineBanner}>
                  <Ionicons name="cloud-offline-outline" size={16} color="#fde68a" />
                  <Text style={styles.offlineBannerText}>
                    Sin conexión: mostrando lo guardado el {formatSavedAt(offlineSince)}.
                  </Text>
                </View>
              )}

              <FieldLabel text="Hotel" />
              {hotels.length === 0 ? (
                <Text style={styles.noRooms}>Esta O.S. no tiene hoteles asignados.</Text>
              ) : (
                <SelectField
                  label="Hotel"
                  placeholder="Seleccionar hotel"
                  options={hotels.map((h) => ({ id: h.id, label: h.name.trim() }))}
                  selectedId={idHotel}
                  onSelect={setIdHotel}
                />
              )}

              <FieldLabel text="Transportadora" />
              {transports.length === 0 ? (
                <Text style={styles.noRooms}>Esta estación no tiene transportadoras.</Text>
              ) : (
                <SelectField
                  label="Transportadora"
                  placeholder="Seleccionar transportadora"
                  options={transports.map((t) => ({ id: t.id, label: t.name }))}
                  selectedId={idTransport}
                  onSelect={setIdTransport}
                />
              )}

              <FieldLabel text="Tipo de unidad" />
              <SelectField
                label="Tipo de unidad"
                placeholder="Seleccionar tipo de unidad"
                options={units.map((u) => ({ id: u.id, label: u.name.trim() }))}
                selectedId={unit}
                onSelect={setUnit}
              />

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
