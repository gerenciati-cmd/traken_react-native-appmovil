import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, gradients, radii, shadow } from '../theme/colors';
import { getOrderDetail, getOrderFiles, OrderFileDTO, uploadOrderFiles } from '../api/client';
import { useOfflineLoad, formatSavedAt } from '../utils/useOfflineLoad';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'DetalleOrden'>;

/**
 * Equivalente movil de op/modulos/details/details.php: info general de la
 * O.S. + desglose de pasajeros por hotel y habitacion, con quien la
 * registro. Solo lectura.
 */
export default function DetalleOrdenScreen({ route, navigation }: Props) {
  const { folio, idAirport, folioDisplay } = route.params;

  const {
    data,
    isLoading,
    error,
    offlineSince,
    reload,
  } = useOfflineLoad(
    `order_detail_${folio}_${idAirport}`,
    () => getOrderDetail(folio, idAirport),
    (res) => ({ order: res.order!, hotelesPax: res.hoteles_pax ?? [] }),
    [folio, idAirport]
  );

  const [files, setFiles] = useState<OrderFileDTO[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    try {
      const res = await getOrderFiles(folio, idAirport);
      if (res.ok) setFiles(res.files ?? []);
    } catch (e) {
      // Silencioso: los comprobantes son un extra dentro de esta pantalla,
      // no bloquea ver el resto del detalle si no hay señal.
    } finally {
      setIsLoadingFiles(false);
    }
  }, [folio, idAirport]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const doUpload = async (picked: { uri: string; name: string; mimeType: string }[]) => {
    if (picked.length === 0) return;
    setIsUploading(true);
    try {
      const res = await uploadOrderFiles(folio, idAirport, picked);
      if (res.ok) {
        if (res.rechazados && res.rechazados.length > 0) {
          Alert.alert('Algunos archivos no se subieron', 'Solo se aceptan imágenes o PDF: ' + res.rechazados.join(', '));
        }
        await loadFiles();
      } else {
        Alert.alert('No se pudo subir', res.error ?? 'Intenta de nuevo.');
      }
    } catch (e) {
      Alert.alert('Sin conexión', 'No se pudo subir el archivo. Intenta de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permiso necesario', 'Activa el permiso de cámara.'); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (res.canceled) return;
    const a = res.assets[0];
    await doUpload([{ uri: a.uri, name: a.fileName ?? `foto_${Date.now()}.jpg`, mimeType: a.mimeType ?? 'image/jpeg' }]);
  };

  const handlePickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permiso necesario', 'Activa el permiso de galería.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true });
    if (res.canceled) return;
    await doUpload(
      res.assets.map((a, i) => ({ uri: a.uri, name: a.fileName ?? `foto_${Date.now()}_${i}.jpg`, mimeType: a.mimeType ?? 'image/jpeg' }))
    );
  };

  const handlePickPdf = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', multiple: true });
    if (res.canceled) return;
    await doUpload(res.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/pdf' })));
  };

  const handleAddFile = () => {
    Alert.alert('Agregar comprobante', '¿Qué quieres subir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Tomar foto', onPress: handleTakePhoto },
      { text: 'Elegir de galería', onPress: handlePickImages },
      { text: 'Elegir PDF', onPress: handlePickPdf },
    ]);
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
                  Sin conexión: mostrando lo guardado el {formatSavedAt(offlineSince)}.
                </Text>
              </View>
            )}

            <View style={[styles.card, shadow.card]}>
              <InfoRow label="Aerolínea" value={data.order.airline} />
              <InfoRow label="Vuelo" value={data.order.flight ?? '—'} />
              <InfoRow label="Evento" value={data.order.event_name ?? '—'} />
              <InfoRow label="Estado" value={data.order.status} />
              <InfoRow label="Fecha entrada" value={data.order.date_in ?? '—'} />
              <InfoRow label="Fecha salida" value={data.order.date_out ?? '—'} />
              <InfoRow label="Hoteles" value={data.order.hotels.join(', ') || '—'} last />
            </View>

            <Text style={styles.sectionTitle}>Pasajeros por hotel</Text>
            {data.hotelesPax.length === 0 ? (
              <Text style={styles.emptyText}>No hay pasajeros registrados en esta O.S.</Text>
            ) : (
              data.hotelesPax.map((h, hi) => (
                <View key={hi} style={[styles.card, shadow.card]}>
                  <Text style={styles.hotelName}>{h.hotel_name}</Text>
                  {h.rooms.map((r, ri) => (
                    <View key={ri} style={styles.roomBlock}>
                      <View style={styles.roomHead}>
                        <Text style={styles.roomLabel}>Habitación {ri + 1}</Text>
                        {r.updated_by && <Text style={styles.roomUpdatedBy}>Por {r.updated_by}</Text>}
                      </View>
                      {r.pax.map((p) => (
                        <View key={p.id} style={styles.paxRow}>
                          <Ionicons name="person-outline" size={13} color={colors.textMuted} />
                          <Text style={styles.paxName} numberOfLines={1}>{p.name}</Text>
                          <Text style={styles.paxType}>{p.type}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ))
            )}

            <View style={styles.filesHeader}>
              <Text style={styles.sectionTitle}>Comprobantes</Text>
              <Pressable style={styles.addFileBtn} onPress={handleAddFile} disabled={isUploading}>
                {isUploading ? (
                  <ActivityIndicator color="#06322f" size="small" />
                ) : (
                  <>
                    <Ionicons name="add" size={16} color="#06322f" />
                    <Text style={styles.addFileBtnText}>Subir</Text>
                  </>
                )}
              </Pressable>
            </View>

            {isLoadingFiles ? (
              <ActivityIndicator color={colors.teal} style={{ marginVertical: 16 }} />
            ) : files.length === 0 ? (
              <Text style={styles.emptyText}>No hay comprobantes subidos para esta O.S.</Text>
            ) : (
              <View style={styles.filesGrid}>
                {files.map((f) => (
                  <Pressable
                    key={f.name}
                    style={styles.fileThumb}
                    onPress={() => (f.type === 'image' ? setPreviewImage(f.url) : Linking.openURL(f.url))}
                  >
                    {f.type === 'image' ? (
                      <Image source={{ uri: f.url }} style={styles.fileThumbImg} resizeMode="cover" />
                    ) : (
                      <View style={styles.filePdfBox}>
                        <Ionicons name="document-text-outline" size={26} color={colors.teal} />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <Pressable style={styles.previewOverlay} onPress={() => setPreviewImage(null)}>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
          )}
          <Pressable style={styles.previewClose} onPress={() => setPreviewImage(null)}>
            <Ionicons name="close-circle" size={32} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
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
  card: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 14,
    marginBottom: 14,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  infoLabel: { color: colors.textMuted, fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { color: colors.white, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  hotelName: { color: colors.teal, fontWeight: '800', fontSize: 13.5, marginBottom: 10 },
  roomBlock: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  roomHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  roomLabel: { color: colors.white, fontWeight: '700', fontSize: 12 },
  roomUpdatedBy: { color: colors.textMuted, fontSize: 10.5 },
  paxRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  paxName: { color: colors.text, fontSize: 12, flex: 1 },
  paxType: { color: colors.textMuted, fontSize: 10.5, textTransform: 'uppercase' },
  filesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  addFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.teal,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  addFileBtnText: { color: '#06322f', fontWeight: '800', fontSize: 12 },
  filesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fileThumb: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  fileThumbImg: { width: '100%', height: '100%' },
  filePdfBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: '80%' },
  previewClose: { position: 'absolute', top: 50, right: 20 },
});
