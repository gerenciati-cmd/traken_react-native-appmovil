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

type PassengerForm = {
  name: string;
  voucher: string;
  type: PaxType;
  ageC: number;
  ageI: number;
  chek: 0 | 1 | 2;
  fSalida: string;
  hora: string;
  breakfast: number;
  lunch: number;
  dinner: number;
};

function makePassenger(fSalida: string, hora: string): PassengerForm {
  return {
    name: '',
    voucher: '',
    type: 'adulto',
    ageC: 2,
    ageI: 0,
    chek: 0,
    fSalida,
    hora,
    breakfast: 0,
    lunch: 0,
    dinner: 0,
  };
}

/**
 * Equivalente movil de op/modulos/open/add.php + insertDetailOrder.php.
 *
 * OJO -- esto es UNA habitacion (1 hotel + 1 ocupacion), que puede traer
 * VARIOS pasajeros dentro (ej. una familia): igual que en la web, se
 * guarda 1 sola fila en orders_open y se resta 1 SOLO cuarto disponible,
 * sin importar cuantos pasajeros se agreguen con el boton "+ Agregar
 * pasajero a este cuarto" de abajo. Un pasajero por cuarto sigue
 * funcionando igual, solo que ahora ya no obliga a gastar un cuarto
 * completo por cada persona cuando comparten habitacion.
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
  const [defaultFSalida, setDefaultFSalida] = useState('');
  const [defaultHora, setDefaultHora] = useState('');
  const [passengers, setPassengers] = useState<PassengerForm[]>([makePassenger('', '')]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await getHotelsForOrder(folio, idAirport);
      if (res.ok) {
        const list = (res.hotels ?? []).filter((h) => h.rooms_dis !== 0);
        setHotels(list);
        if (list.length === 1) setIdHotel(list[0].id);
        const fs = res.default_date_out ? res.default_date_out.slice(0, 10) : '';
        const hr = res.default_hour ? res.default_hour.slice(0, 5) : '';
        setDefaultFSalida(fs);
        setDefaultHora(hr);
        setPassengers([makePassenger(fs, hr)]);
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

  const updatePassenger = (index: number, patch: Partial<PassengerForm>) => {
    setPassengers((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const addPassenger = () => {
    setPassengers((prev) => [...prev, makePassenger(defaultFSalida, defaultHora)]);
  };

  const removePassenger = (index: number) => {
    setPassengers((prev) => prev.filter((_, i) => i !== index));
  };

  const canSubmit =
    !!idHotel &&
    passengers.length > 0 &&
    passengers.every((p) => p.name.trim().length > 0 && p.fSalida.trim().length > 0 && p.hora.trim().length > 0) &&
    !isSaving;

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
        passengers: passengers.map((p) => ({
          name: p.name.trim(),
          voucher: p.voucher.trim(),
          f_salida: p.fSalida.trim(),
          hora: p.hora.trim(),
          type: p.type,
          chek: p.chek,
          age_c: p.type === 'nino' ? p.ageC : 0,
          age_i: p.type === 'infante' ? p.ageI : 0,
          breakfast: showMeals ? p.breakfast : 0,
          lunch: showMeals ? p.lunch : 0,
          dinner: showMeals ? p.dinner : 0,
        })),
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

      Alert.alert('Habitación agregada', '¿Quieres agregar otra habitación a esta O.S.?', [
        { text: 'Terminar', style: 'cancel', onPress: () => navigation.navigate('OpenOrders') },
        {
          text: 'Agregar otra',
          onPress: () => {
            setOcupation('');
            setPassengers([makePassenger(defaultFSalida, defaultHora)]);
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
            <Text style={styles.topTitle}>Agregar Habitación</Text>
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
                  <FieldLabel text="Ocupación (de la habitación)" />
                  <ChipRow>
                    {['SGL', 'DBL', 'TPL', 'CDPL'].map((op) => (
                      <Chip key={op} label={op} active={ocupation === op} onPress={() => setOcupation(op)} />
                    ))}
                  </ChipRow>
                </>
              )}

              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>
                Pasajeros en esta habitación ({passengers.length})
              </Text>

              {passengers.map((p, index) => (
                <PassengerCard
                  key={index}
                  index={index}
                  passenger={p}
                  showMeals={showMeals}
                  canRemove={passengers.length > 1}
                  onChange={(patch) => updatePassenger(index, patch)}
                  onRemove={() => removePassenger(index)}
                />
              ))}

              <Pressable style={styles.addPassengerBtn} onPress={addPassenger}>
                <Ionicons name="add-circle-outline" size={18} color={colors.teal} />
                <Text style={styles.addPassengerText}>Agregar pasajero a este cuarto</Text>
              </Pressable>

              <Pressable
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                <Text style={styles.submitText}>{isSaving ? 'Guardando...' : 'Guardar Habitación'}</Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

function PassengerCard({
  index,
  passenger,
  showMeals,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  passenger: PassengerForm;
  showMeals: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<PassengerForm>) => void;
  onRemove: () => void;
}) {
  return (
    <View style={[styles.paxCard, shadow.card]}>
      <View style={styles.paxCardHead}>
        <Text style={styles.paxCardTitle}>Pasajero {index + 1}</Text>
        {canRemove && (
          <Pressable onPress={onRemove} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </Pressable>
        )}
      </View>

      <FieldLabel text="Nombre completo" />
      <TextInput
        value={passenger.name}
        onChangeText={(t) => onChange({ name: t })}
        placeholder="Nombre completo del pasajero"
        placeholderTextColor={colors.placeholder}
        style={styles.input}
        autoCapitalize="words"
      />

      <FieldLabel text="Voucher (opcional)" />
      <TextInput
        value={passenger.voucher}
        onChangeText={(t) => onChange({ voucher: t })}
        placeholder="Número de voucher"
        placeholderTextColor={colors.placeholder}
        style={styles.input}
        autoCapitalize="characters"
      />

      <FieldLabel text="Early / Late (opcional)" />
      <ChipRow>
        <Chip label="Ninguno" active={passenger.chek === 0} onPress={() => onChange({ chek: 0 })} />
        <Chip label="Early Check-In" active={passenger.chek === 1} onPress={() => onChange({ chek: 1 })} />
        <Chip label="Late Check-Out" active={passenger.chek === 2} onPress={() => onChange({ chek: 2 })} />
      </ChipRow>

      <View style={styles.row2}>
        <View style={styles.row2Item}>
          <FieldLabel text="Fecha salida" />
          <TextInput
            value={passenger.fSalida}
            onChangeText={(t) => onChange({ fSalida: t })}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
          />
        </View>
        <View style={styles.row2Item}>
          <FieldLabel text="Hora salida" />
          <TextInput
            value={passenger.hora}
            onChangeText={(t) => onChange({ hora: t })}
            placeholder="HH:MM"
            placeholderTextColor={colors.placeholder}
            style={styles.input}
          />
        </View>
      </View>

      <FieldLabel text="Tipo de pasajero" />
      <ChipRow>
        <Chip label="Adulto" active={passenger.type === 'adulto'} onPress={() => onChange({ type: 'adulto' })} />
        <Chip label="Niño" active={passenger.type === 'nino'} onPress={() => onChange({ type: 'nino' })} />
        <Chip label="Infante" active={passenger.type === 'infante'} onPress={() => onChange({ type: 'infante' })} />
      </ChipRow>

      {passenger.type === 'nino' && (
        <>
          <FieldLabel text="Edad del niño" />
          <ChipRow>
            {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
              <Chip key={n} label={String(n)} active={passenger.ageC === n} onPress={() => onChange({ ageC: n })} />
            ))}
          </ChipRow>
        </>
      )}
      {passenger.type === 'infante' && (
        <>
          <FieldLabel text="Edad del infante" />
          <ChipRow>
            <Chip label="0 años" active={passenger.ageI === 0} onPress={() => onChange({ ageI: 0 })} />
            <Chip label="1 año" active={passenger.ageI === 1} onPress={() => onChange({ ageI: 1 })} />
          </ChipRow>
        </>
      )}

      {showMeals && (
        <>
          <FieldLabel text="Comidas (número de veces)" />
          <MealCounter label="Desayuno" value={passenger.breakfast} onChange={(n) => onChange({ breakfast: n })} />
          <MealCounter label="Comida" value={passenger.lunch} onChange={(n) => onChange({ lunch: n })} />
          <MealCounter label="Cena" value={passenger.dinner} onChange={(n) => onChange({ dinner: n })} />
        </>
      )}
    </View>
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
  divider: { height: 1, backgroundColor: colors.cardBorder, marginTop: 20, marginBottom: 14 },
  sectionTitle: { color: colors.white, fontWeight: '800', fontSize: 13.5, marginBottom: 10 },
  paxCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 14,
    marginBottom: 14,
  },
  paxCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  paxCardTitle: { color: colors.teal, fontWeight: '800', fontSize: 12.5, textTransform: 'uppercase', letterSpacing: 0.5 },
  addPassengerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.teal,
    borderStyle: 'dashed',
    borderRadius: radii.input,
    paddingVertical: 12,
    marginBottom: 20,
  },
  addPassengerText: { color: colors.teal, fontWeight: '800', fontSize: 13 },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
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
    backgroundColor: colors.navy2,
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
    marginTop: 6,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#06322f', fontWeight: '800', fontSize: 15 },
});
