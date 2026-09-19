import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { getReportDownloadUrl, getReportList, ReportHotel, sendReportByEmail } from '../api/client';
import { useOfflineLoad, formatSavedAt } from '../utils/useOfflineLoad';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportePicker'>;

/**
 * Equivalente movil de op/modulos/reports/report.php: un reporte (Excel)
 * por hotel + uno General, cada uno con Descargar y Enviar por correo.
 */
export default function ReportePickerScreen({ route, navigation }: Props) {
  const { folio, idAirport, folioDisplay } = route.params;

  const [email, setEmail] = useState('');
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const {
    data,
    isLoading,
    error,
    offlineSince,
    reload,
  } = useOfflineLoad(
    `report_list_${folio}_${idAirport}`,
    () => getReportList(folio, idAirport),
    (res) => ({
      script: res.script ?? 'paxes',
      hotels: res.hotels ?? [],
      totalGeneral: res.total_general ?? 0,
    }),
    [folio, idAirport]
  );

  const handleDownload = useCallback(
    async (idHotel: number, label: string) => {
      if (!data) return;
      const key = String(idHotel);
      setDownloadingKey(key);
      setMsg(null);
      try {
        const fileName = `Reporte-${folioDisplay.replace(/[^A-Za-z0-9-]/g, '')}-${label.replace(/[^A-Za-z0-9]/g, '')}.xlsx`;
        const destination = new File(Paths.cache, fileName);
        if (destination.exists) destination.delete();

        const task = File.createDownloadTask(getReportDownloadUrl(data.script, folio, idHotel, idAirport), destination);
        const downloaded = await task.downloadAsync();

        if (!downloaded || !downloaded.exists || downloaded.size === 0) {
          throw new Error('empty-download');
        }

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloaded.uri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Reporte de pasajeros',
          });
        } else {
          Alert.alert('Descargado', 'El reporte se guardó, pero este dispositivo no puede compartirlo/abrirlo directo.');
        }
      } catch (e) {
        Alert.alert(
          'No se pudo descargar',
          'Si no te deja descargar en este dispositivo, escribe un correo abajo y usa "Enviar" en su lugar.'
        );
      } finally {
        setDownloadingKey(null);
      }
    },
    [data, folio, idAirport, folioDisplay]
  );

  const handleSend = useCallback(
    async (idHotel: number) => {
      if (!data) return;
      const trimmed = email.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setMsg({ ok: false, text: 'Escribe un correo válido arriba para enviar el reporte.' });
        return;
      }
      const key = String(idHotel);
      setSendingKey(key);
      setMsg(null);
      try {
        const res = await sendReportByEmail({
          id_order: folio,
          id_hotel: idHotel,
          id_airport: idAirport,
          email: trimmed,
          script: data.script,
        });
        setMsg({ ok: !!res.ok, text: res.msg ?? res.error ?? 'Respuesta inesperada.' });
      } catch (e) {
        setMsg({ ok: false, text: 'Error de conexión al enviar. Puede tardar unos segundos, intenta de nuevo.' });
      } finally {
        setSendingKey(null);
      }
    },
    [data, email, folio, idAirport]
  );

  return (
    <LinearGradient colors={gradients.hero} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.topTitle}>Reporte #{folioDisplay}</Text>
          <View style={styles.backBtn} />
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        ) : error || !data ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error ?? 'No se pudo cargar.'}</Text>
            <Pressable style={styles.retryBtn} onPress={reload}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {offlineSince && (
              <View style={styles.offlineBanner}>
                <Ionicons name="cloud-offline-outline" size={16} color="#fde68a" />
                <Text style={styles.offlineBannerText}>
                  Sin conexión: mostrando lo guardado el {formatSavedAt(offlineSince)}. Necesitas internet para
                  descargar o enviar.
                </Text>
              </View>
            )}

            <View style={styles.mailBox}>
              <Text style={styles.mailLabel}>Enviar reporte por correo</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={colors.placeholder}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={styles.mailHint}>
                Si no te deja descargar directo, escribe tu correo aquí y usa "Enviar" en cada reporte. Te llega el
                Excel por enlace.
              </Text>
            </View>

            {(data.hotels as ReportHotel[]).map((h) => (
              <ReportCard
                key={h.id_hotel}
                title={h.name}
                pax={h.total_pax}
                isDownloading={downloadingKey === String(h.id_hotel)}
                isSending={sendingKey === String(h.id_hotel)}
                onDownload={() => handleDownload(h.id_hotel, h.name)}
                onSend={() => handleSend(h.id_hotel)}
              />
            ))}

            <ReportCard
              title="GENERAL (todos)"
              pax={data.totalGeneral}
              general
              isDownloading={downloadingKey === '0'}
              isSending={sendingKey === '0'}
              onDownload={() => handleDownload(0, 'GENERAL')}
              onSend={() => handleSend(0)}
            />

            {msg && (
              <View style={[styles.msgBox, { backgroundColor: msg.ok ? '#dcfce7' : '#fee2e2' }]}>
                <Text style={{ color: msg.ok ? '#166534' : '#991b1b', fontWeight: '700', fontSize: 12.5 }}>
                  {msg.text}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

function ReportCard({
  title,
  pax,
  general,
  isDownloading,
  isSending,
  onDownload,
  onSend,
}: {
  title: string;
  pax: number;
  general?: boolean;
  isDownloading: boolean;
  isSending: boolean;
  onDownload: () => void;
  onSend: () => void;
}) {
  return (
    <View style={[styles.card, shadow.card, general && styles.cardGeneral]}>
      <View style={styles.cardTop}>
        <Text style={[styles.cardTitle, general && styles.cardTitleGeneral]} numberOfLines={1}>
          {general ? '★ ' : ''}{title}
        </Text>
        <View style={[styles.countBadge, general && styles.countBadgeGeneral]}>
          <Text style={[styles.countText, general && styles.countTextGeneral]}>{pax} pax</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <Pressable style={[styles.actionBtn, styles.downloadBtn]} onPress={onDownload} disabled={isDownloading}>
          {isDownloading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="download-outline" size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Descargar</Text>
            </>
          )}
        </Pressable>
        <Pressable style={[styles.actionBtn, styles.sendBtn]} onPress={onSend} disabled={isSending}>
          {isSending ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="mail-outline" size={14} color={colors.white} />
              <Text style={styles.actionBtnText}>Enviar</Text>
            </>
          )}
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
  topTitle: { color: colors.white, fontSize: 15, fontWeight: '800' },
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
  mailBox: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.card,
    padding: 14,
    marginBottom: 16,
  },
  mailLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    height: 44,
    color: colors.text,
    fontSize: 14,
  },
  mailHint: { color: colors.textMuted, fontSize: 10.5, marginTop: 8, lineHeight: 15 },
  card: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 13,
    marginBottom: 10,
  },
  cardGeneral: { backgroundColor: colors.navy3, borderColor: colors.navy3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  cardTitle: { color: colors.white, fontWeight: '700', fontSize: 13, flexShrink: 1 },
  cardTitleGeneral: { fontWeight: '800' },
  countBadge: { backgroundColor: 'rgba(43,183,179,0.16)', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  countBadgeGeneral: { backgroundColor: 'rgba(255,255,255,0.18)' },
  countText: { color: colors.teal, fontSize: 10.5, fontWeight: '800' },
  countTextGeneral: { color: '#fff' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 9,
  },
  downloadBtn: { backgroundColor: '#16a34a' },
  sendBtn: { backgroundColor: '#0891b2' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  msgBox: { borderRadius: 10, padding: 10, marginTop: 4, alignItems: 'center' },
});
