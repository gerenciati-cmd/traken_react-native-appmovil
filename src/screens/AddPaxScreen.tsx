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
import { addPax, getHotelsForOrder, HotelDTO, PaxType } from '../api/client';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'AddPax'>;

/**
 * Equivalente movil de op/modulos/open/add.php + insertDetailOrder.php:
 * agrega UN pasajero (con su habitacion) a la O.S. Mismo criterio de
 * campos condicionales que la web (ocupacion, comidas segun type_airline),
 * pero con selectores tipo "chip" en vez de <select> nativo -- mas comodo
 * en celular y consistente con el resto de la app.
 */
export default function AddPaxScreen({ route, navigation }: Props) {
  const { folio, idAirport, folioDisplay, iata, typeAirline } = route.params;

  const showOcupation = typeAirline === 'ep' || (typeAirline === 'all' && idAirport === 14);
  const showMeals = typeAirline === 'ep';

  const [hotels, setHotels] = useState<HotelDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [idHotel, setIdHotel] = useState<number | null>(null);
  const [ocupation, setOcupation] = useState('');
  const [name, setName] = useState('');
  const [voucher, setVoucher] = useState('');
  const [fSalida, setFSalida] = useState('');
  const [hora, setHora] = useState('');
  const [chek, setChek] = useState<0 | 1 | 2>(0);
  const [type, setType] = useState<PaxType>('adulto');
  const [ageC, setAgeC] = useState(2);
  const [ageI, setAgeI] = useState(0);
  const [breakfast, setBreakfast] = useState(0);
  const [lunch, setLunch] = useState(0);
  const [dinner, setDinner] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await getHotelsForOrder(folio, idAirport);
      if (res.ok) {
        const list = (res.hotels ?? []).filter((h) => h.rooms_dis !== 0);
        setHotels(list);
        if (list.length === 1) setIdHotel(list[0].id);
        if (res.default_date_out) setFSalida(res.default_date_out.slice(0, 10));
        if (res.default_hour) setHora(res.default_hour.slice(0, 5));
      } else {
        setLoadError(res.error ?? 'No se pudo cargar la disponibilidad.');
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

  const resetPaxFields = () => {
    setName('');
    setVoucher('');
    setChek(0);
    setType('adulto');
    setAgeC(2);
    setAgeI(0);
    setBreakfast(0);
    setLunch(0);
    setDinner(0);
  };

  const canSubmit = !!idHotel && name.trim().length > 0 && fSalida.trim().length > 0 && hora.trim().length > 0 && !isSaving;

  const handleSubmit = async () => {
    if (!canSubmit || !idHotel) return;
    setIsSaving(true);
    try {
      const res = await addPax({
        id_order: folio,
        id_airport: idAirport,
        id_hotel: idHotel,
        type_airline: typeAirline,
        ocupation: showOcupation ? ocupation : undefined,
        name: name.trim(),
        voucher: voucher.trim(),
        f_salida: fSalida.trim(),
        hora: hora.trim(),
        type,
        chek,
        age_c: type === 'nino' ? ageC : 0,
        age_i: type === 'infante' ? ageI : 0,
        breakfast: showMeals ? breakfast : 0,
        lunch: showMeals ? lunch : 0,
        dinner: showMeals ? dinner : 0,
      });

      if (res.status === 'dispo') {
        Alert.alert('Sin disponibilidad', res.msg ?? 'No hay habitaciones disponibles en ese hotel.');
        load();
        return;
      }
      if (!res.ok) {
        Alert.alert('No se pudo guardar', res.error ?? res.msg ?? 'Intenta de nuevo.');
        return;
      }

      Alert.alert('Pasajero agregado', '¿Quieres agregar otro pasajero a esta O.S.?', [
        { text: 'Terminar', style: 'cancel', onPress: () => navigation.navigate('OpenOrders') },
        {
          text: 'Agregar otro',
          onPress: () => {
            resetPaxFields();
            load();
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
            <Text style={styles.topTitle}>Agregar Pasajero</Text>
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
                <Text style={styles.noRooms}>No hay hoteles con habitaciones disponibles.</Text>
              ) : (
                <ChipRow>
                  {hotels.map((h) => (
                    <Chip
                      key={h.id}
                      label={`${h.name.trim()} (${h.rooms_dis})`}
                      active={idHotel === h.id}
                      onPress={() => setIdHotel(h.id)}
                    />
                  ))}
                </ChipRow>
              )}

              {showOcupation && (
                <>
                  <FieldLabel text="Ocupación" />
                  <ChipRow>
                    {['SGL', 'DBL', 'TPL', 'CDPL'].map((op) => (
                      <Chip key={op} label={op} active={ocupation === op} onPress={() => setOcupation(op)} />
                    ))}
                  </ChipRow>
                </>
              )}

              <FieldLabel text="Nombre completo" />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Nombre completo del pasajero"
                placeholderTextColor={colors.placeholder}
                style={styles.input}
                autoCapitalize="words"
              />

              <FieldLabel text="Voucher (opcional)" />
              <TextInput
                value={voucher}
                onChangeText={setVoucher}
                placeholder="Número de voucher"
                placeholderTextColor={colors.placeholder}
                style={styles.input}
                autoCapitalize="characters"
              />

              <FieldLabel text="Early / Late (opcional)" />
              <ChipRow>
                <Chip label="Ninguno" active={chek === 0} onPress={() => setChek(0)} />
                <Chip label="Early Check-In" active={chek === 1} onPress={() => setChek(1)} />
                <Chip label="Late Check-Out" active={chek === 2} onPress={() => setChek(2)} />
              </ChipRow>

              <View style={styles.row2}>
                <View style={styles.row2Item}>
                  <FieldLabel text="Fecha salida" />
                  <TextInput
                    value={fSalida}
                    onChangeText={setFSalida}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={colors.placeholder}
                    style={styles.input}
                  />
                </View>
                <View style={styles.row2Item}>
                  <FieldLabel text="Hora salida" />
                  <TextInput
                    value={hora}
                    onChangeText={setHora}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.placeholder}
                    style={styles.input}
                  />
                </View>
              </View>

              <FieldLabel text="Tipo de pasajero" />
              <ChipRow>
                <Chip label="Adulto" active={type === 'adulto'} onPress={() => setType('adulto')} />
                <Chip label="Niño" active={type === 'nino'} onPress={() => setType('nino')} />
                <Chip label="Infante" active={type === 'infante'} onPress={() => setType('infante')} />
              </ChipRow>

              {type === 'nino' && (
                <>
                  <FieldLabel text="Edad del niño" />
                  <ChipRow>
                    {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                      <Chip key={n} label={String(n)} active={ageC === n} onPress={() => setAgeC(n)} />
                    ))}
                  </ChipRow>
                </>
              )}
              {type === 'infante' && (
                <>
                  <FieldLabel text="Edad del infante" />
                  <ChipRow>
                    <Chip label="0 años" active={ageI === 0} onPress={() => setAgeI(0)} />
                    <Chip label="1 año" active={ageI === 1} onPress={() => setAgeI(1)} />
                  </ChipRow>
                </>
              )}

              {showMeals && (
                <>
                  <FieldLabel text="Comidas (número de veces)" />
                  <MealCounter label="Desayuno" value={breakfast} onChange={setBreakfast} />
                  <MealCounter label="Comida" value={lunch} onChange={setLunch} />
                  <MealCounter label="Cena" value={dinner} onChange={setDinner} />
                </>
              )}

              <Pressable
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                <Text style={styles.submitText}>{isSaving ? 'Guardando...' : 'Guardar Pasajero'}</Text>
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

function MealCounter({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.mealRow}>
      <Text style={styles.mealLabel}>{label}</Text>
      <View style={styles.mealCounter}>
        <Pressable style={styles.mealBtn} onPress={() => onChange(Math.max(0, value - 1))}>
          <Ionicons name="remove" size={16} color="#fff" />
        </Pressable>
        <Text style={styles.mealValue}>{value}</Text>
        <Pressable style={styles.mealBtn} onPress={() => onChange(Math.min(6, value + 1))}>
          <Ionicons name="add" size={16} color="#fff" />
        </Pressable>
      </View>
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
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.input,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  mealLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  mealCounter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mealBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.navy3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealValue: { color: colors.white, fontWeight: '800', fontSize: 14, minWidth: 18, textAlign: 'center' },
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
