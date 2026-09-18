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
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, gradients, radii, shadow } from '../theme/colors';
import { DelayFormData, getDelayImageUrl, sendDelayEmail } from '../api/client';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Delay'>;

const LANGS: { code: string; label: string }[] = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'it', label: 'Italiano' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
];

/** Mismos textos exactos que op/modulos/delayInfo/di_render.php (el generador
 * que usa el servidor), para que la vista previa diga lo mismo que la imagen
 * real que se descarga/envía. */
const TEXTS: Record<string, { title: string; msg: string; flight: string; dest: string; pickup: string; departure: string; paxFrom: string }> = {
  es: { title: 'INFORMACION SOBRE\nRETRASOS', msg: 'Estimados huéspedes, nos disculpamos por las molestias causadas por el retraso. Su bienestar es nuestra prioridad. Para ayudarle, le proporcionamos la siguiente información.', flight: 'NO. DE VUELO:', dest: 'DESTINO:', pickup: 'HORA DE RECOGIDA:', departure: 'HORA ESTIMADA DE SALIDA:', paxFrom: 'SOLO PASAJEROS DEL:' },
  en: { title: 'DELAY\nINFORMATION', msg: 'Dear guests, we apologize for the inconvenience caused by the delay. Your well-being is our priority. To assist you, we provide the following information.', flight: 'FLIGHT NO:', dest: 'DESTINATION:', pickup: 'PICK UP TIME:', departure: 'ESTIMATED TIME DEPARTURE:', paxFrom: 'ONLY PASSENGERS FROM:' },
  it: { title: 'INFORMAZIONI SUI\nRITARDI', msg: 'Gentili ospiti, ci scusiamo per il disagio causato dal ritardo. Il vostro benessere è la nostra priorità. Per venirvi in aiuto, vi forniamo le seguenti informazioni.', flight: 'FLIGHT NO:', dest: 'DESTINATION:', pickup: 'PICK UP TIME:', departure: 'ESTIMATED TIME DEPARTURE:', paxFrom: 'ONLY PASSENGERS FROM:' },
  fr: { title: 'INFORMATIONS SUR\nLES RETARDS', msg: 'Chers clients, nous nous excusons pour la gêne causée par le retard. Votre bien-être est notre priorité. Pour vous aider, nous vous fournissons les informations suivantes.', flight: 'NO. DE VOL:', dest: 'DESTINATION:', pickup: 'HEURE DE PRISE EN CHARGE:', departure: 'HEURE ESTIMÉE DE DÉPART:', paxFrom: 'UNIQUEMENT PASSAGERS DU:' },
  de: { title: 'INFORMATIONEN ZU\nVERSPÄTUNGEN', msg: 'Liebe Gäste, wir entschuldigen uns für die Unannehmlichkeiten durch die Verspätung. Ihr Wohlbefinden hat für uns Priorität. Um Ihnen zu helfen, stellen wir Ihnen folgende Informationen zur Verfügung.', flight: 'FLUGNUMMER:', dest: 'ZIEL:', pickup: 'ABHOLZEIT:', departure: 'VORAUSSICHTLICHE ABFLUGZEIT:', paxFrom: 'NUR PASSAGIERE VOM:' },
  pt: { title: 'INFORMACOES SOBRE\nATRASOS', msg: 'Prezados hóspedes, pedimos desculpas pelo inconveniente causado pelo atraso. Seu bem-estar é nossa prioridade. Para ajudá-lo, fornecemos as seguintes informações.', flight: 'NO. DO VOO:', dest: 'DESTINO:', pickup: 'HORARIO DE BUSCA:', departure: 'HORARIO ESTIMADO DE PARTIDA:', paxFrom: 'APENAS PASSAGEIROS DE:' },
};

const CYAN = '#0891b2';
const NAVY = '#16214d';
const RED = '#c8102e';

function formatDate(d: string): string {
  if (!d) return '--';
  const p = d.split('-');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const mi = parseInt(p[1], 10) - 1;
  if (!p[0] || !p[2] || !months[mi]) return '--';
  return `${months[mi]} ${p[2]} ${p[0]}`;
}

/**
 * Equivalente movil del modal "Delay" (Aviso de Retraso) de
 * op/modulos/open/inicio.php. La IMAGEN real (la que se descarga o se manda
 * por correo) la sigue generando el servidor con el mismo PHP/GD que usa la
 * web (op/modulos/delayInfo/descargar.php y enviar_correo.php -- ninguno de
 * los dos exige sesion, asi que el movil los llama directo, sin tocar el
 * backend), asi que ese archivo queda IDENTICO al de la web, con el logo de
 * la aerolinea y el QR de encuesta reales. La vista previa de aqui abajo es
 * una aproximacion visual (sin el logo/QR reales) solo para que el usuario
 * vea el contenido antes de bajarlo o enviarlo.
 */
export default function DelayScreen({ route, navigation }: Props) {
  const { folio, idAirport, folioDisplay, iata, airline, flight } = route.params;

  const [lang, setLang] = useState('es');
  const [airlineText, setAirlineText] = useState(airline ?? '');
  const [flightText, setFlightText] = useState(flight ?? '');
  const [dest, setDest] = useState('');
  const [pickup, setPickup] = useState('01:00');
  const [departure, setDeparture] = useState('04:30');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [showPreview, setShowPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [mail, setMail] = useState('');
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [mailMsg, setMailMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const t = TEXTS[lang] ?? TEXTS.es;

  const formData: DelayFormData = {
    lang,
    airline: airlineText,
    flight: flightText,
    dest,
    pickup,
    departure,
    date,
    folio: String(folio),
    estacion: iata ?? '',
  };

  const fields = [
    { lbl: t.flight, val: (flightText || '---').toUpperCase(), bar: CYAN, color: NAVY, big: false },
    { lbl: t.dest, val: (dest || '---').toUpperCase(), bar: NAVY, color: NAVY, big: false },
    { lbl: t.pickup, val: `${pickup || '00:00'} hrs.`, bar: RED, color: RED, big: true },
    { lbl: t.departure, val: `${departure || '00:00'} hrs.`, bar: RED, color: RED, big: true },
    { lbl: t.paxFrom, val: formatDate(date), bar: NAVY, color: NAVY, big: false },
  ];

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const fileName = `DelayInfo_${(airlineText || 'delay').replace(/[^A-Za-z0-9]/g, '')}_${(flightText || '').replace(/[^A-Za-z0-9]/g, '')}.png`;
      const destination = new File(Paths.cache, fileName);
      if (destination.exists) destination.delete();

      const task = File.createDownloadTask(getDelayImageUrl(formData), destination);
      const downloaded = await task.downloadAsync();

      if (!downloaded || !downloaded.exists || downloaded.size === 0) {
        throw new Error('empty-download');
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(downloaded.uri, { mimeType: 'image/png', dialogTitle: 'Aviso de Retraso' });
      } else {
        Alert.alert('Descargado', 'La imagen se guardó, pero este dispositivo no puede compartirla/abrirla directo.');
      }
    } catch (e) {
      Alert.alert('No se pudo descargar', 'Hubo un problema de conexión. Intenta de nuevo.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSendMail = async () => {
    const to = mail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      setMailMsg({ ok: false, text: 'Escribe un correo válido.' });
      return;
    }
    setIsSendingMail(true);
    setMailMsg(null);
    try {
      const res = await sendDelayEmail(to, formData);
      setMailMsg({ ok: !!res.ok, text: res.msg ?? (res.ok ? 'Enviado' : 'No se pudo enviar. Intenta de nuevo.') });
    } catch (e) {
      setMailMsg({ ok: false, text: 'Error de conexión. Intenta de nuevo.' });
    } finally {
      setIsSendingMail(false);
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
            <Text style={styles.topTitle}>Aviso de Retraso</Text>
            <Text style={styles.topSub}>#{folioDisplay}{iata ? ' · ' + iata : ''}</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <FieldLabel text="Idioma del aviso" />
            <View style={styles.chipRow}>
              {LANGS.map((l) => (
                <Pressable
                  key={l.code}
                  style={[styles.chip, lang === l.code && styles.chipActive]}
                  onPress={() => setLang(l.code)}
                >
                  <Text style={[styles.chipText, lang === l.code && styles.chipTextActive]}>{l.label}</Text>
                </Pressable>
              ))}
            </View>

            <FieldLabel text="Aerolínea" />
            <TextInput
              value={airlineText}
              onChangeText={setAirlineText}
              placeholder="Ej: AEROMEXICO"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />

            <FieldLabel text="No. de Vuelo" />
            <TextInput
              value={flightText}
              onChangeText={setFlightText}
              placeholder="Ej: AM-431"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              autoCapitalize="characters"
            />

            <FieldLabel text="Destino" />
            <TextInput
              value={dest}
              onChangeText={setDest}
              placeholder="Ej: CANCUN (CUN)"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              autoCapitalize="characters"
            />

            <View style={styles.row2}>
              <View style={styles.row2Item}>
                <FieldLabel text="Pick Up Time" />
                <TextInput
                  value={pickup}
                  onChangeText={setPickup}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.placeholder}
                  style={styles.input}
                />
              </View>
              <View style={styles.row2Item}>
                <FieldLabel text="Hora Est. Salida" />
                <TextInput
                  value={departure}
                  onChangeText={setDeparture}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.placeholder}
                  style={styles.input}
                />
              </View>
            </View>

            <FieldLabel text="Fecha (Only passengers from)" />
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />

            <Pressable style={styles.previewBtn} onPress={() => setShowPreview(true)}>
              <Text style={styles.previewBtnText}>Vista Previa</Text>
            </Pressable>

            {showPreview && (
              <>
                <View style={[styles.card, shadow.card]}>
                  <View style={[styles.cardBar, { top: 0 }]} />
                  <Text style={styles.cardTitle}>{t.title}</Text>
                  <Text style={styles.cardMsg}>{t.msg}</Text>
                  <View style={styles.cardDivider} />
                  {fields.map((f, i) => (
                    <View key={i} style={styles.fieldRow}>
                      <View style={[styles.fieldBar, { backgroundColor: f.bar }]} />
                      <View>
                        <Text style={styles.fieldLbl}>{f.lbl}</Text>
                        <Text style={[styles.fieldVal, f.big && styles.fieldValBig, { color: f.color }]}>{f.val}</Text>
                      </View>
                    </View>
                  ))}
                  <View style={styles.qrCard}>
                    <Ionicons name="qr-code-outline" size={56} color={NAVY} />
                    <Text style={styles.qrCap}>Código QR de encuesta de satisfacción (incluido en la imagen real)</Text>
                    <Text style={styles.qrFolio}>Folio {folioDisplay}</Text>
                  </View>
                  {!!airlineText && <Text style={styles.cardAirline}>{airlineText.toUpperCase()}</Text>}
                  <View style={[styles.cardBar, { bottom: 0 }]} />
                </View>
                <Text style={styles.previewNote}>
                  Esta es una vista previa aproximada. La imagen que descargues o envíes por correo se genera en el
                  servidor con el logo real de la aerolínea y el código QR funcional, igual que en la web.
                </Text>

                <Pressable style={styles.downloadBtn} onPress={handleDownload} disabled={isDownloading}>
                  {isDownloading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={16} color="#fff" />
                      <Text style={styles.downloadBtnText}>Descargar Imagen</Text>
                    </>
                  )}
                </Pressable>

                <FieldLabel text="Enviar a este correo" />
                <TextInput
                  value={mail}
                  onChangeText={setMail}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor={colors.placeholder}
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Pressable style={styles.mailBtn} onPress={handleSendMail} disabled={isSendingMail}>
                  {isSendingMail ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="mail-outline" size={16} color="#fff" />
                      <Text style={styles.mailBtnText}>Enviar por correo</Text>
                    </>
                  )}
                </Pressable>
                {mailMsg && (
                  <View style={[styles.mailMsgBox, { backgroundColor: mailMsg.ok ? '#dcfce7' : '#fee2e2' }]}>
                    <Text style={{ color: mailMsg.ok ? '#166534' : '#991b1b', fontWeight: '700', fontSize: 12.5 }}>
                      {mailMsg.text}
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
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
  content: { padding: 16, paddingBottom: 50 },
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
  previewBtn: {
    backgroundColor: CYAN,
    borderRadius: radii.button,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  previewBtnText: { color: '#fff', fontWeight: '800', fontSize: 14.5 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    paddingTop: 24,
    marginTop: 20,
    overflow: 'hidden',
  },
  cardBar: { position: 'absolute', left: 0, right: 0, height: 5, backgroundColor: CYAN },
  cardTitle: { color: CYAN, fontSize: 17, fontWeight: '800', textAlign: 'center', lineHeight: 21 },
  cardMsg: { color: '#1e293b', fontSize: 11.5, lineHeight: 17, marginTop: 12, marginBottom: 14 },
  cardDivider: { height: 1, backgroundColor: '#e2e8f0', marginBottom: 14 },
  fieldRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  fieldBar: { width: 4, borderRadius: 2 },
  fieldLbl: { fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  fieldVal: { fontSize: 17, fontWeight: '900' },
  fieldValBig: { fontSize: 22 },
  qrCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  qrCap: { fontSize: 10.5, color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 14 },
  qrFolio: { fontSize: 11.5, color: CYAN, fontWeight: '800', marginTop: 6 },
  cardAirline: { fontSize: 10.5, color: '#64748b', fontWeight: '700', marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', textAlign: 'center', letterSpacing: 0.5 },
  previewNote: { color: colors.textMuted, fontSize: 11, lineHeight: 15, marginTop: 10 },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: radii.button,
    height: 48,
    marginTop: 16,
  },
  downloadBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  mailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CYAN,
    borderRadius: radii.button,
    height: 48,
    marginTop: 12,
  },
  mailBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  mailMsgBox: { borderRadius: 10, padding: 10, marginTop: 10, alignItems: 'center' },
});
