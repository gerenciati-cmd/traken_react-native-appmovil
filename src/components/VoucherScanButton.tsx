import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../theme/colors';
import { logVoucherScan } from '../api/client';
import { iniciarEscaneoVoucher, escanearConOcrLocal, ScanStage } from '../utils/voucherScan';

type Props = {
  idOrder?: number;
  idAirport?: number;
  onNameDetected: (name: string) => void;
};

/**
 * Version "solo lectura" del escaneo (sin guardar foto de soporte) -- para
 * cuando el pasajero AUN NO EXISTE en la base de datos (AddPaxScreen, antes
 * de guardar), asi que no hay id_pax al que pegarle una foto todavia. Solo
 * autocompleta el nombre, igual que op/modulos/open/add.php en la web.
 */
export default function VoucherScanButton({ idOrder, idAirport, onNameDetected }: Props) {
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [showOcrOption, setShowOcrOption] = useState(false);
  const [showGuess, setShowGuess] = useState(false);
  const [guess, setGuess] = useState('');
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const cancelRef = React.useRef<(() => void) | null>(null);

  const pick = async (source: 'camera' | 'library'): Promise<string | null> => {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso necesario', 'Activa el permiso de cámara.');
        return null;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      return res.canceled ? null : res.assets[0].uri;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Activa el permiso de galería.');
      return null;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    return res.canceled ? null : res.assets[0].uri;
  };

  const handleStage = (stage: ScanStage) => {
    if (stage.kind === 'ai-loading') setMessage(stage.message);
    else if (stage.kind === 'ai-slow') {
      setMessage(stage.message);
      setShowOcrOption(true);
    } else if (stage.kind === 'done') {
      setScanning(false);
      setShowOcrOption(false);
      setMessage(stage.message);
      setGuess(stage.nombre);
      setShowGuess(true);
    }
  };

  const empezar = async (source: 'camera' | 'library') => {
    const uri = await pick(source);
    if (!uri) return;
    setPendingUri(uri);
    setScanning(true);
    setShowGuess(false);
    setShowOcrOption(false);
    cancelRef.current = iniciarEscaneoVoucher(uri, { idOrder, idAirport, onStage: handleStage });
  };

  const usarOcr = async () => {
    if (!pendingUri) return;
    if (cancelRef.current) cancelRef.current();
    setShowOcrOption(false);
    setMessage('📄 Leyendo con OCR local, un momento…');
    try {
      const { nombre } = await escanearConOcrLocal(pendingUri);
      setScanning(false);
      setGuess(nombre);
      setShowGuess(true);
      setMessage(nombre ? '📄 Texto detectado por OCR local (revísalo):' : '⚠️ No se encontró texto claro. Escríbelo aquí:');
      logVoucherScan('ocr', !!nombre, idOrder, idAirport);
    } catch (e) {
      setScanning(false);
      setShowGuess(true);
      setGuess('');
      setMessage('⚠️ El OCR local necesita una build compilada (no funciona en Expo Go). Escribe el nombre a mano:');
      logVoucherScan('ocr', false, idOrder, idAirport, 'ML Kit no disponible');
    }
  };

  const aMano = () => {
    if (cancelRef.current) cancelRef.current();
    setScanning(false);
    setShowOcrOption(false);
    setShowGuess(true);
    setGuess('');
    setMessage('Escribe el nombre que veas en la foto:');
    logVoucherScan('manual', false, idOrder, idAirport);
  };

  const usar = () => {
    if (guess.trim()) onNameDetected(guess.trim());
    setShowGuess(false);
    setPendingUri(null);
  };

  const cancelar = () => {
    if (cancelRef.current) cancelRef.current();
    setScanning(false);
    setShowGuess(false);
    setShowOcrOption(false);
    setPendingUri(null);
  };

  if (scanning || showGuess) {
    return (
      <View style={styles.scanBox}>
        <Text style={styles.scanMessage}>{message}</Text>
        {scanning && <ActivityIndicator color={colors.teal} style={{ marginTop: 8 }} />}
        {showOcrOption && (
          <View style={styles.fallbackRow}>
            <Pressable onPress={aMano}><Text style={styles.fallbackLink}>Escribir a mano</Text></Pressable>
            <Pressable onPress={usarOcr}><Text style={styles.fallbackLink}>Leer con OCR local (sin internet)</Text></Pressable>
          </View>
        )}
        {showGuess && (
          <>
            <TextInput
              value={guess}
              onChangeText={setGuess}
              placeholder="Nombre detectado (edítalo si hace falta)"
              placeholderTextColor={colors.placeholder}
              style={styles.guessInput}
              autoCapitalize="characters"
            />
            <View style={styles.guessActions}>
              <Pressable style={styles.guessCancelBtn} onPress={cancelar}>
                <Text style={styles.guessCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.guessUseBtn} onPress={usar}>
                <Text style={styles.guessUseText}>Usar este nombre</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Pressable style={styles.btn} onPress={() => empezar('camera')}>
        <Ionicons name="camera-outline" size={14} color="#fff" />
        <Text style={styles.btnText}>Escanear voucher (opcional)</Text>
      </Pressable>
      <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => empezar('library')}>
        <Ionicons name="images-outline" size={14} color="#0f172a" />
        <Text style={styles.btnGhostText}>Galería</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#0891b2', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  btnGhost: { backgroundColor: '#f1f5f9' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 11.5 },
  btnGhostText: { color: '#0f172a', fontWeight: '700', fontSize: 11.5 },
  scanBox: { backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: radii.input, padding: 12 },
  scanMessage: { color: '#0369a1', fontSize: 12.5, lineHeight: 18 },
  fallbackRow: { flexDirection: 'row', gap: 14, marginTop: 8, flexWrap: 'wrap' },
  fallbackLink: { color: '#0369a1', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  guessInput: {
    marginTop: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 42,
    color: '#0f172a',
    fontSize: 13.5,
  },
  guessActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  guessCancelBtn: { flex: 1, backgroundColor: '#e2e8f0', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  guessCancelText: { color: '#334155', fontWeight: '700', fontSize: 12.5 },
  guessUseBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  guessUseText: { color: '#fff', fontWeight: '700', fontSize: 12.5 },
});
