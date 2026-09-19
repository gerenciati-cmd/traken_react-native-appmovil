import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, gradients, radii, shadow } from '../theme/colors';
import {
  getCreateOrderHotels,
  getCreateOrderOptions,
  getEditOrderInfo,
  NamedOption,
  updateOrder,
  UpdateOrderHotelInput,
} from '../api/client';
import SelectField from '../components/SelectField';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'EditarOrden'>;

type HotelRow = {
  key: string;
  id_orders_hotels?: number;
  idHotel: number | null;
  name?: string;
  dispo: string;
  isNew: boolean;
};

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function toHHmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function parseISODate(iso: string): Date {
  const d = new Date((iso || '').slice(0, 10) + 'T00:00:00');
  return isNaN(d.getTime()) ? new Date() : d;
}
function parseHHmm(hhmm: string): Date {
  const parts = (hhmm || '').split(':');
  const d = new Date();
  d.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
  return d;
}
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function formatDateDisplay(iso: string): string {
  const d = parseISODate(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Equivalente movil de op/modulos/createEdit/edit.php (unifica tambien
 * insertNewHotel.php y deleteHotel.php, que en la web son pantallas
 * separadas, en un solo guardado). Aeropuerto y aerolinea son de solo
 * lectura -- igual que en el formulario web (esos campos estan
 * deshabilitados alla tambien, no es un recorte de esta version).
 */
export default function EditarOrdenScreen({ route, navigation }: Props) {
  const { folio, idAirport, folioDisplay } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [iata, setIata] = useState('');
  const [airline, setAirline] = useState('');
  const [flight, setFlight] = useState('');
  const [events, setEvents] = useState<NamedOption[]>([]);
  const [eventId, setEventId] = useState<number | null>(null);
  const [dateIn, setDateIn] = useState('');
  const [dateOut, setDateOut] = useState('');
  const [hour, setHour] = useState('');
  const [hotelRows, setHotelRows] = useState<HotelRow[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [hotelsCatalog, setHotelsCatalog] = useState<NamedOption[]>([]);

  const [activePicker, setActivePicker] = useState<'dateIn' | 'dateOut' | 'hour' | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [infoRes, optionsRes, hotelsRes] = await Promise.all([
          getEditOrderInfo(folio, idAirport),
          getCreateOrderOptions(),
          getCreateOrderHotels(idAirport),
        ]);
        if (!infoRes.ok || !infoRes.order) {
          setLoadError(infoRes.error ?? 'No se pudo cargar la orden.');
          return;
        }
        setIata(infoRes.order.iata);
        setAirline(infoRes.order.airline);
        setFlight(infoRes.order.flight ?? '');
        setEventId(infoRes.order.id_event);
        setDateIn((infoRes.order.date_in ?? '').slice(0, 10));
        setDateOut((infoRes.order.date_out ?? '').slice(0, 10));
        setHour((infoRes.order.hour ?? '00:00:00').slice(0, 5));
        setHotelRows(
          (infoRes.hotels ?? []).map((h) => ({
            key: `h${h.id_orders_hotels}`,
            id_orders_hotels: h.id_orders_hotels,
            idHotel: h.id_hotel,
            name: h.name.trim(),
            dispo: String(h.rooms_dis),
            isNew: false,
          }))
        );
        setEvents(optionsRes.ok ? optionsRes.events ?? [] : []);
        setHotelsCatalog(hotelsRes.ok ? hotelsRes.hotels ?? [] : []);
      } catch (e) {
        setLoadError('Sin conexión. Revisa tu internet e intenta de nuevo.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [folio, idAirport]);

  const handlePickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    const target = activePicker;
    if (Platform.OS === 'android') setActivePicker(null);
    if (event.type === 'dismissed' || !selected) return;
    if (target === 'dateIn') setDateIn(toISODate(selected));
    else if (target === 'dateOut') setDateOut(toISODate(selected));
    else if (target === 'hour') setHour(toHHmm(selected));
  };

  const addHotelRow = () => {
    setHotelRows((rows) => [...rows, { key: `new${Date.now()}`, idHotel: null, dispo: '', isNew: true }]);
  };

  const removeHotelRow = (row: HotelRow) => {
    if (!row.isNew && row.id_orders_hotels) {
      setDeletedIds((ids) => [...ids, row.id_orders_hotels!]);
    }
    setHotelRows((rows) => rows.filter((r) => r.key !== row.key));
  };

  const updateHotelRow = (key: string, patch: Partial<HotelRow>) => {
    setHotelRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const canSubmit =
    flight.trim() !== '' &&
    !!eventId &&
    !!dateIn &&
    !!dateOut &&
    !!hour &&
    hotelRows.every((r) => !!r.idHotel && parseInt(r.dispo, 10) >= 0) &&
    !isSaving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const hotelsPayload: UpdateOrderHotelInput[] = hotelRows.map((r) => ({
      id_orders_hotels: r.isNew ? undefined : r.id_orders_hotels,
      id_hotel: r.idHotel!,
      dispo: parseInt(r.dispo, 10) || 0,
    }));

    setIsSaving(true);
    try {
      const res = await updateOrder({
        id_order: folio,
        id_airport: idAirport,
        flight: flight.trim(),
        event: eventId!,
        date_in: dateIn,
        date_out: dateOut,
        hour: hour.length === 5 ? `${hour}:00` : hour,
        hotels: hotelsPayload,
        deleted_hotel_ids: deletedIds,
      });
      if (res.ok) {
        Alert.alert('O.S. actualizada', res.msg ?? '', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert('No se pudo guardar', res.error ?? 'Intenta de nuevo.');
      }
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
          <Text style={styles.topTitle}>#{folioDisplay}</Text>
          <View style={styles.backBtn} />
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        ) : loadError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <FieldLabel text="Aeropuerto" />
              <View style={styles.readonlyField}>
                <Text style={styles.readonlyText}>{iata}</Text>
              </View>

              <FieldLabel text="Aerolínea" />
              <View style={styles.readonlyField}>
                <Text style={styles.readonlyText}>{airline}</Text>
              </View>

              <FieldLabel text="Número de Vuelo" />
              <TextInput
                value={flight}
                onChangeText={setFlight}
                placeholder="# Vuelo"
                placeholderTextColor={colors.placeholder}
                style={styles.input}
                autoCapitalize="characters"
              />

              <FieldLabel text="Tipo de Evento" />
              <SelectField
                label="Tipo de Evento"
                placeholder="Seleccionar evento"
                options={events.map((e) => ({ id: e.id, label: e.name }))}
                selectedId={eventId}
                onSelect={setEventId}
              />

              <FieldLabel text="Hoteles" />
              {hotelRows.map((row, idx) => (
                <View key={row.key} style={styles.hotelRow}>
                  <View style={styles.hotelRowTop}>
                    <Text style={styles.hotelRowLabel}>Hotel {idx + 1}</Text>
                    <Pressable onPress={() => removeHotelRow(row)} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                  {row.isNew ? (
                    <SelectField
                      label={`Hotel ${idx + 1}`}
                      placeholder="Seleccionar hotel"
                      options={hotelsCatalog
                        .filter((h) => !hotelRows.some((r) => r.key !== row.key && r.idHotel === h.id))
                        .map((h) => ({ id: h.id, label: h.name.trim() }))}
                      selectedId={row.idHotel}
                      onSelect={(id) => updateHotelRow(row.key, { idHotel: id })}
                    />
                  ) : (
                    <View style={styles.readonlyField}>
                      <Text style={styles.readonlyText}>{row.name}</Text>
                    </View>
                  )}
                  <TextInput
                    value={row.dispo}
                    onChangeText={(v) => updateHotelRow(row.key, { dispo: v })}
                    placeholder="Disponibilidad (# de cuartos)"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="number-pad"
                    style={[styles.input, { marginTop: 8 }]}
                  />
                </View>
              ))}
              <Pressable style={styles.addHotelBtn} onPress={addHotelRow}>
                <Ionicons name="add-circle-outline" size={16} color={colors.teal} />
                <Text style={styles.addHotelText}>Agregar hotel</Text>
              </Pressable>

              <FieldLabel text="Fecha Entrada" />
              <Pressable style={styles.pickerField} onPress={() => setActivePicker('dateIn')}>
                <Ionicons name="calendar-outline" size={16} color={colors.teal} />
                <Text style={styles.pickerFieldText}>{formatDateDisplay(dateIn)}</Text>
              </Pressable>

              <FieldLabel text="Fecha Salida" />
              <Pressable style={styles.pickerField} onPress={() => setActivePicker('dateOut')}>
                <Ionicons name="calendar-outline" size={16} color={colors.teal} />
                <Text style={styles.pickerFieldText}>{formatDateDisplay(dateOut)}</Text>
              </Pressable>

              <FieldLabel text="Hora Pick Up" />
              <Pressable style={styles.pickerField} onPress={() => setActivePicker('hour')}>
                <Ionicons name="time-outline" size={16} color={colors.teal} />
                <Text style={styles.pickerFieldText}>{hour} hrs.</Text>
              </Pressable>

              <Pressable
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                {isSaving ? <ActivityIndicator color="#06322f" /> : <Text style={styles.submitText}>ACTUALIZAR</Text>}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>

      {activePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={activePicker === 'hour' ? parseHHmm(hour) : parseISODate(activePicker === 'dateIn' ? dateIn : dateOut)}
          mode={activePicker === 'hour' ? 'time' : 'date'}
          is24Hour
          display="default"
          onChange={handlePickerChange}
        />
      )}
      {Platform.OS === 'ios' && (
        <Modal visible={!!activePicker} transparent animationType="slide" onRequestClose={() => setActivePicker(null)}>
          <View style={styles.iosPickerOverlay}>
            <View style={styles.iosPickerSheet}>
              <Pressable style={styles.iosPickerDone} onPress={() => setActivePicker(null)}>
                <Text style={styles.iosPickerDoneText}>Listo</Text>
              </Pressable>
              {activePicker && (
                <DateTimePicker
                  value={activePicker === 'hour' ? parseHHmm(hour) : parseISODate(activePicker === 'dateIn' ? dateIn : dateOut)}
                  mode={activePicker === 'hour' ? 'time' : 'date'}
                  is24Hour
                  display="spinner"
                  onChange={handlePickerChange}
                />
              )}
            </View>
          </View>
        </Modal>
      )}
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
  topTitle: { color: colors.white, fontSize: 15, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 50 },
  errorBox: { alignItems: 'center', gap: 10, padding: 30 },
  errorText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
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
  readonlyField: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radii.input,
    paddingHorizontal: 14,
    height: 46,
    justifyContent: 'center',
  },
  readonlyText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.inputBg,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    height: 46,
  },
  pickerFieldText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  hotelRow: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.card,
    padding: 12,
    marginBottom: 10,
  },
  hotelRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  hotelRowLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  addHotelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, marginBottom: 6 },
  addHotelText: { color: colors.teal, fontWeight: '700', fontSize: 12.5 },
  submitBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.button,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#06322f', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  iosPickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.5)' },
  iosPickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 20 },
  iosPickerDone: { alignItems: 'flex-end', paddingHorizontal: 18, paddingVertical: 12 },
  iosPickerDoneText: { color: colors.teal, fontWeight: '800', fontSize: 15 },
});
