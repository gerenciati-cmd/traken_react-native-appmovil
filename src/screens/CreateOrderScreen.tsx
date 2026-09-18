import React, { useCallback, useEffect, useState } from 'react';
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, gradients, radii, shadow } from '../theme/colors';
import {
  createOrder,
  CreateOrderHotelInput,
  getCreateOrderAirlines,
  getCreateOrderHotels,
  getCreateOrderOptions,
  NamedOption,
  StationOption,
} from '../api/client';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateOrder'>;

const SC_EVENT_ID = 12;

type HotelRow = { key: string; idHotel: number | null; dispo: string };

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function nowHHmm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Misma regla que op/modulos/create/valida.js: solo el día 1 del mes se
 * permite registrar con fecha del mes anterior; del día 2 en adelante, solo
 * mes actual o futuro. */
function checkDateAllowed(dateStr: string): boolean {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return true;
  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const dinYear = parseInt(parts[0], 10);
  const dinMonth = parseInt(parts[1], 10) - 1;

  let minMonth: number;
  let minYear: number;
  if (todayDay === 1) {
    if (todayMonth === 0) { minMonth = 11; minYear = todayYear - 1; }
    else { minMonth = todayMonth - 1; minYear = todayYear; }
  } else {
    minMonth = todayMonth;
    minYear = todayYear;
  }
  return dinYear * 12 + dinMonth >= minYear * 12 + minMonth;
}

/**
 * Equivalente movil de op/modulos/create/inicio.php + insertNewOrder.php:
 * Aeropuerto -> Evento -> Aerolinea -> Hotel(es) -> fechas/hora -> Crear.
 * Mismo flujo de Servicio de Cortesia (advertencia antes de elegirlo) y de
 * fecha bloqueada (fuera del periodo del mes, con codigo de verificacion
 * para el caso especial) que la web -- el servidor (createOrder.php) valida
 * todo de nuevo, esto solo evita el viaje redondo cuando ya se sabe la
 * respuesta.
 */
export default function CreateOrderScreen({ navigation }: Props) {
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [events, setEvents] = useState<NamedOption[]>([]);

  const [idAirport, setIdAirport] = useState<number | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [airlines, setAirlines] = useState<NamedOption[]>([]);
  const [hotelsCatalog, setHotelsCatalog] = useState<NamedOption[]>([]);

  const [flight, setFlight] = useState('');
  const [eventId, setEventId] = useState<number | null>(null);
  const [scConfirmed, setScConfirmed] = useState(false);
  const [showScWarning, setShowScWarning] = useState(false);

  const [airlineId, setAirlineId] = useState<number | null>(null);
  const [hotelRows, setHotelRows] = useState<HotelRow[]>([{ key: 'h0', idHotel: null, dispo: '' }]);

  const [dateIn, setDateIn] = useState(todayISO(0));
  const [dateOut, setDateOut] = useState(todayISO(1));
  const [hour, setHour] = useState(nowHHmm());

  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<{ code: string; sc: boolean } | null>(null);

  const [blocked, setBlocked] = useState<{ label: string; date: string } | null>(null);
  const [blockedCode, setBlockedCode] = useState('');
  const [blockedError, setBlockedError] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  const loadOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    setLoadError(null);
    try {
      const res = await getCreateOrderOptions();
      if (res.ok) {
        setStations(res.stations ?? []);
        setEvents(res.events ?? []);
        if ((res.stations ?? []).length === 1) setIdAirport(res.stations![0].id);
      } else {
        setLoadError(res.error ?? 'No se pudo cargar la información.');
      }
    } catch (e) {
      setLoadError('Sin conexión. Revisa tu internet e intenta de nuevo.');
    } finally {
      setIsLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    if (!idAirport) return;
    setAirlineId(null);
    setHotelRows([{ key: 'h0', idHotel: null, dispo: '' }]);
    setIsLoadingCatalog(true);
    Promise.all([getCreateOrderAirlines(idAirport), getCreateOrderHotels(idAirport)])
      .then(([airlinesRes, hotelsRes]) => {
        setAirlines(airlinesRes.ok ? airlinesRes.airlines ?? [] : []);
        setHotelsCatalog(hotelsRes.ok ? hotelsRes.hotels ?? [] : []);
      })
      .catch(() => {
        setAirlines([]);
        setHotelsCatalog([]);
      })
      .finally(() => setIsLoadingCatalog(false));
  }, [idAirport]);

  const resetForm = () => {
    setFlight('');
    setEventId(null);
    setScConfirmed(false);
    setAirlineId(null);
    setHotelRows([{ key: 'h0', idHotel: null, dispo: '' }]);
    setDateIn(todayISO(0));
    setDateOut(todayISO(1));
    setHour(nowHHmm());
    setResult(null);
  };

  const selectEvent = (id: number) => {
    if (id === SC_EVENT_ID && !scConfirmed) {
      setEventId(id);
      setShowScWarning(true);
      return;
    }
    setEventId(id);
  };

  const cancelSc = () => {
    setShowScWarning(false);
    setEventId(null);
    setScConfirmed(false);
  };

  const confirmSc = () => {
    setScConfirmed(true);
    setShowScWarning(false);
  };

  const addHotelRow = () => {
    setHotelRows((rows) => [...rows, { key: `h${rows.length}${Date.now()}`, idHotel: null, dispo: '' }]);
  };

  const removeHotelRow = (key: string) => {
    setHotelRows((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows));
  };

  const updateHotelRow = (key: string, patch: Partial<HotelRow>) => {
    setHotelRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const buildHotelsPayload = (): CreateOrderHotelInput[] | null => {
    const out: CreateOrderHotelInput[] = [];
    for (const r of hotelRows) {
      const dispoNum = parseInt(r.dispo, 10);
      if (!r.idHotel || !dispoNum || dispoNum <= 0) return null;
      out.push({ id_hotel: r.idHotel, dispo: dispoNum });
    }
    return out.length > 0 ? out : null;
  };

  const canSubmit =
    !!idAirport && flight.trim() !== '' && !!eventId && !!airlineId && !!dateIn && !!dateOut && !!hour && !isSaving;

  const doCreate = async (codigoVerif?: string) => {
    if (!idAirport || !eventId || !airlineId) return;
    const hotelsPayload = buildHotelsPayload();
    if (!hotelsPayload) {
      Alert.alert('Faltan hoteles', 'Elige un hotel y una disponibilidad válida (mayor a 0) en cada fila.');
      return;
    }

    try {
      const res = await createOrder({
        id_airport: idAirport,
        flight: flight.trim(),
        event: eventId,
        airline: airlineId,
        date_in: dateIn,
        date_out: dateOut,
        hour,
        hotels: hotelsPayload,
        codigo_verif: codigoVerif,
      });

      if (!res.ok && res.error === 'fecha_bloqueada') {
        if (codigoVerif) {
          setBlockedError('Código incorrecto. Se envió una alerta y la O.S. no se guardó.');
        } else {
          setBlocked({ label: 'fecha de entrada', date: dateIn });
        }
        return;
      }

      if (!res.ok) {
        Alert.alert('No se pudo crear la O.S.', res.error ?? res.msg ?? 'Intenta de nuevo.');
        return;
      }

      setBlocked(null);
      setBlockedCode('');
      setBlockedError('');
      setResult({ code: res.code ?? '', sc: !!res.sc });
    } catch (e) {
      if (codigoVerif) {
        setBlockedError('Sin conexión. Intenta de nuevo.');
      } else {
        Alert.alert('Sin conexión', 'No se pudo crear la O.S. Intenta de nuevo.');
      }
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    if (eventId !== SC_EVENT_ID) {
      if (!checkDateAllowed(dateIn)) { setBlocked({ label: 'fecha de entrada', date: dateIn }); return; }
      if (!checkDateAllowed(dateOut)) { setBlocked({ label: 'fecha de salida', date: dateOut }); return; }
    }

    setIsSaving(true);
    try {
      await doCreate();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitWithCode = async () => {
    setBlockedError('');
    setIsVerifyingCode(true);
    try {
      await doCreate(blockedCode);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  if (result) {
    return (
      <LinearGradient colors={gradients.hero} style={styles.flex}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.flex}>
          <View style={styles.resultWrap}>
            {result.sc ? (
              <View style={[styles.resultCard, styles.resultCardWarn]}>
                <Text style={styles.resultIcon}>⚠️</Text>
                <Text style={styles.resultCode}>ORDEN #{result.code}</Text>
                <Text style={styles.resultText}>
                  Orden registrada como <Text style={{ fontWeight: '800' }}>Servicio de Cortesía</Text>. Pendiente de
                  validación por supervisor. Se envió notificación al validador.
                </Text>
              </View>
            ) : (
              <View style={[styles.resultCard, styles.resultCardOk]}>
                <Ionicons name="checkmark-circle" size={44} color="#16a34a" />
                <Text style={styles.resultCode}>ORDEN #{result.code}</Text>
              </View>
            )}
            <Pressable style={styles.resultBtn} onPress={resetForm}>
              <Text style={styles.resultBtnText}>Crear otra O.S.</Text>
            </Pressable>
            <Pressable style={styles.resultBtnGhost} onPress={() => navigation.navigate('OpenOrders')}>
              <Text style={styles.resultBtnGhostText}>Ver Órdenes Abiertas</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradients.hero} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.topTitle}>Crear O.S.</Text>
          <View style={styles.backBtn} />
        </View>

        {isLoadingOptions ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        ) : loadError ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable style={styles.retryBtn} onPress={loadOptions}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <FieldLabel text="Aeropuerto" />
              <ChipRow>
                {stations.map((s) => (
                  <Chip key={s.id} label={s.name} active={idAirport === s.id} onPress={() => setIdAirport(s.id)} />
                ))}
                {stations.length === 0 && <Text style={styles.noRooms}>No tienes estaciones asignadas.</Text>}
              </ChipRow>

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
              <ChipRow>
                {events.map((e) => (
                  <Chip key={e.id} label={e.name} active={eventId === e.id} onPress={() => selectEvent(e.id)} />
                ))}
              </ChipRow>

              {idAirport ? (
                isLoadingCatalog ? (
                  <ActivityIndicator color={colors.teal} style={{ marginTop: 16 }} />
                ) : (
                  <>
                    <FieldLabel text="Aerolínea" />
                    {airlines.length === 0 ? (
                      <Text style={styles.noRooms}>Esta estación no tiene aerolíneas activas.</Text>
                    ) : (
                      <ChipRow>
                        {airlines.map((a) => (
                          <Chip key={a.id} label={a.name} active={airlineId === a.id} onPress={() => setAirlineId(a.id)} />
                        ))}
                      </ChipRow>
                    )}

                    <FieldLabel text="Hoteles" />
                    {hotelsCatalog.length === 0 ? (
                      <Text style={styles.noRooms}>Esta estación no tiene hoteles activos.</Text>
                    ) : (
                      hotelRows.map((row, idx) => (
                        <View key={row.key} style={styles.hotelRow}>
                          <View style={styles.hotelRowTop}>
                            <Text style={styles.hotelRowLabel}>Hotel {idx + 1}</Text>
                            {hotelRows.length > 1 && (
                              <Pressable onPress={() => removeHotelRow(row.key)} hitSlop={8}>
                                <Ionicons name="close-circle" size={18} color={colors.danger} />
                              </Pressable>
                            )}
                          </View>
                          <ChipRow>
                            {hotelsCatalog.map((h) => (
                              <Chip
                                key={h.id}
                                label={h.name.trim()}
                                active={row.idHotel === h.id}
                                onPress={() => updateHotelRow(row.key, { idHotel: h.id })}
                              />
                            ))}
                          </ChipRow>
                          <TextInput
                            value={row.dispo}
                            onChangeText={(v) => updateHotelRow(row.key, { dispo: v })}
                            placeholder="Disponibilidad (# de cuartos)"
                            placeholderTextColor={colors.placeholder}
                            keyboardType="number-pad"
                            style={[styles.input, { marginTop: 8 }]}
                          />
                        </View>
                      ))
                    )}
                    {hotelsCatalog.length > 0 && (
                      <Pressable style={styles.addHotelBtn} onPress={addHotelRow}>
                        <Ionicons name="add-circle-outline" size={16} color={colors.teal} />
                        <Text style={styles.addHotelText}>Agregar otro hotel</Text>
                      </Pressable>
                    )}
                  </>
                )
              ) : null}

              <FieldLabel text="Fecha Entrada" />
              <TextInput
                value={dateIn}
                onChangeText={setDateIn}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.placeholder}
                style={styles.input}
              />

              <FieldLabel text="Fecha Salida" />
              <TextInput
                value={dateOut}
                onChangeText={setDateOut}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.placeholder}
                style={styles.input}
              />

              <FieldLabel text="Hora Pick Up" />
              <TextInput
                value={hour}
                onChangeText={setHour}
                placeholder="HH:MM"
                placeholderTextColor={colors.placeholder}
                style={styles.input}
              />

              <Pressable
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                {isSaving ? <ActivityIndicator color="#06322f" /> : <Text style={styles.submitText}>CREAR</Text>}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>

      {/* Modal: advertencia Servicio de Cortesía */}
      <Modal visible={showScWarning} transparent animationType="fade" onRequestClose={cancelSc}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalHeader, { backgroundColor: '#92400e' }]}>
              <Text style={styles.modalHeaderIcon}>⚠️</Text>
              <Text style={styles.modalHeaderTitle}>Servicio de Cortesía</Text>
              <Text style={styles.modalHeaderSub}>Registro fuera del período establecido</Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                Estás registrando esta O.S. como <Text style={{ fontWeight: '800' }}>Servicio de Cortesía (SC)</Text>, lo
                que indica que el servicio fue prestado fuera del período permitido de registro normal.
              </Text>
              <View style={styles.modalNote}>
                <Text style={styles.modalNoteText}>
                  Al confirmar, la O.S. se creará y se enviará automáticamente una notificación a Calidad y Gerencia
                  para su validación o cancelación.
                </Text>
              </View>
              <View style={styles.modalActions}>
                <Pressable style={styles.modalBtnGhost} onPress={cancelSc}>
                  <Text style={styles.modalBtnGhostText}>Cancelar</Text>
                </Pressable>
                <Pressable style={styles.modalBtnWarn} onPress={confirmSc}>
                  <Text style={styles.modalBtnWarnText}>Sí, registrar de todas formas</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: fecha bloqueada (fuera de periodo) */}
      <Modal visible={!!blocked} transparent animationType="fade" onRequestClose={() => setBlocked(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalHeader, { backgroundColor: '#b91c1c' }]}>
              <Text style={styles.modalHeaderIcon}>🚫</Text>
              <Text style={styles.modalHeaderTitle}>No se puede crear la O.S.</Text>
              <Text style={styles.modalHeaderSub}>Fecha fuera del período permitido</Text>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                La {blocked?.label} ({blocked?.date}) pertenece a un mes que ya no está habilitado para registrar
                Órdenes de Servicio.
              </Text>
              <View style={[styles.modalNote, { backgroundColor: '#fef2f2', borderLeftColor: '#ef4444' }]}>
                <Text style={[styles.modalNoteText, { color: '#7f1d1d' }]}>
                  Regla de cierre mensual: día 1 del mes se permiten O.S. del mes anterior. Del día 2 en adelante,
                  solo mes actual o futuro.
                </Text>
              </View>
              <Text style={styles.modalLabel}>¿Tienes autorización especial? Ingresa el código de verificación:</Text>
              <TextInput
                value={blockedCode}
                onChangeText={setBlockedCode}
                placeholder="Código de verificación"
                placeholderTextColor={colors.placeholder}
                secureTextEntry
                style={styles.modalInput}
              />
              {!!blockedError && <Text style={styles.modalError}>{blockedError}</Text>}
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalBtnGhost}
                  onPress={() => {
                    setBlocked(null);
                    setBlockedCode('');
                    setBlockedError('');
                  }}
                >
                  <Text style={styles.modalBtnGhostText}>Cancelar</Text>
                </Pressable>
                <Pressable style={styles.modalBtnDark} onPress={handleSubmitWithCode} disabled={isVerifyingCode}>
                  {isVerifyingCode ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalBtnDarkText}>Continuar con código</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  topTitle: { color: colors.white, fontSize: 15, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 50 },
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

  resultWrap: { flex: 1, padding: 20, justifyContent: 'center', gap: 14 },
  resultCard: { borderRadius: 18, padding: 26, alignItems: 'center', gap: 10 },
  resultCardOk: { backgroundColor: 'rgba(22,163,74,0.14)', borderWidth: 1, borderColor: 'rgba(22,163,74,0.4)' },
  resultCardWarn: { backgroundColor: 'rgba(217,119,6,0.16)', borderWidth: 1, borderColor: 'rgba(217,119,6,0.45)' },
  resultIcon: { fontSize: 34 },
  resultCode: { color: colors.white, fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  resultText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  resultBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.button,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBtnText: { color: '#06322f', fontWeight: '800', fontSize: 14.5 },
  resultBtnGhost: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.button,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBtnGhostText: { color: colors.white, fontWeight: '700', fontSize: 13.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.72)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 18, width: '100%', maxWidth: 420, overflow: 'hidden' },
  modalHeader: { padding: 22, alignItems: 'center' },
  modalHeaderIcon: { fontSize: 34 },
  modalHeaderTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 8, textAlign: 'center' },
  modalHeaderSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11.5, marginTop: 3 },
  modalBody: { padding: 20 },
  modalText: { color: '#1e293b', fontSize: 13.5, lineHeight: 20, marginBottom: 14 },
  modalNote: { backgroundColor: '#fffbeb', borderLeftWidth: 4, borderLeftColor: '#f59e0b', borderRadius: 8, padding: 12, marginBottom: 16 },
  modalNoteText: { color: '#92400e', fontSize: 11.5, lineHeight: 17 },
  modalLabel: { color: '#334155', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: '#0f172a',
  },
  modalError: { color: '#dc2626', fontSize: 11.5, fontWeight: '700', marginTop: 6 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalBtnGhost: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  modalBtnGhostText: { color: '#475569', fontWeight: '700', fontSize: 12.5 },
  modalBtnWarn: { flex: 2, backgroundColor: '#d97706', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  modalBtnWarnText: { color: '#fff', fontWeight: '700', fontSize: 12.5 },
  modalBtnDark: { flex: 2, backgroundColor: '#0f172a', borderRadius: 10, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  modalBtnDarkText: { color: '#fff', fontWeight: '700', fontSize: 12.5 },
});
