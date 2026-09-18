import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../theme/colors';
import { addComment, CommentDTO, getComments } from '../api/client';

type Props = {
  visible: boolean;
  onClose: () => void;
  idOrder: number;
  idAirport: number;
  folioDisplay: string;
};

/**
 * Bitacora de comentarios de una O.S. -- misma tabla y logica que el modal
 * de Comentarios en op/modulos/open/inicio.php (web), consumida via
 * op/api/orders/comments.php y commentAdd.php.
 */
export default function CommentsModal({ visible, onClose, idOrder, idAirport, folioDisplay }: Props) {
  const [items, setItems] = useState<CommentDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getComments(idOrder, idAirport);
      if (res.ok) setItems(res.items ?? []);
      else setError(res.error ?? 'No se pudo cargar.');
    } catch (e) {
      setError('Sin conexión. Revisa tu internet.');
    } finally {
      setIsLoading(false);
    }
  }, [idOrder, idAirport]);

  useEffect(() => {
    if (visible) {
      setText('');
      load();
    }
  }, [visible, load]);

  const handleAdd = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSaving) return;
    setIsSaving(true);
    try {
      const res = await addComment(idOrder, idAirport, trimmed);
      if (res.ok) {
        setText('');
        await load();
      } else {
        setError(res.error ?? res.msg ?? 'No se pudo guardar el comentario.');
      }
    } catch (e) {
      setError('Sin conexión. Intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
          <View style={styles.card}>
            <View style={styles.head}>
              <View>
                <Text style={styles.headTitle}>Comentarios</Text>
                <Text style={styles.headSub}>OS #{folioDisplay}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.ink2} />
              </Pressable>
            </View>

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {isLoading ? (
                <ActivityIndicator color={colors.teal} style={{ marginVertical: 20 }} />
              ) : error ? (
                <Text style={styles.emptyText}>{error}</Text>
              ) : items.length === 0 ? (
                <Text style={styles.emptyText}>Sin comentarios todavía. Sé el primero.</Text>
              ) : (
                items.map((it, idx) => (
                  <View key={idx} style={styles.item}>
                    <View style={styles.itemMeta}>
                      <Text style={styles.itemAuthor} numberOfLines={1}>
                        {it.user_name || 'Usuario'}
                      </Text>
                      <Text style={styles.itemDate}>{it.created_at}</Text>
                    </View>
                    <Text style={styles.itemText}>{it.comment}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.foot}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Escribe un comentario..."
                placeholderTextColor={colors.mut}
                style={styles.input}
                multiline
                maxLength={2000}
              />
              <View style={styles.acts}>
                <Pressable style={[styles.btn, styles.btnClose]} onPress={onClose}>
                  <Text style={styles.btnCloseText}>Cerrar</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnAdd, (!text.trim() || isSaving) && styles.btnDisabled]}
                  onPress={handleAdd}
                  disabled={!text.trim() || isSaving}
                >
                  <Text style={styles.btnAddText}>{isSaving ? 'Guardando...' : 'Agregar'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', padding: 16 },
  kav: { width: '100%' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headTitle: { fontSize: 15.5, fontWeight: '800', color: colors.navy },
  headSub: { fontSize: 12, color: colors.ink2, marginTop: 2 },
  list: { flexGrow: 0 },
  listContent: { padding: 18, gap: 10, minHeight: 100 },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingVertical: 12 },
  item: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 10 },
  itemMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 4 },
  itemAuthor: { color: '#0891b2', fontWeight: '700', fontSize: 11.5, flexShrink: 1 },
  itemDate: { color: '#64748b', fontSize: 10.5, fontWeight: '700' },
  itemText: { color: '#0f172a', fontSize: 13.5, lineHeight: 19 },
  foot: { padding: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    fontSize: 13.5,
    minHeight: 56,
    maxHeight: 100,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  acts: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { flex: 1, borderRadius: 9, paddingVertical: 11, alignItems: 'center' },
  btnClose: { backgroundColor: '#e2e8f0' },
  btnCloseText: { color: '#334155', fontWeight: '700', fontSize: 13.5 },
  btnAdd: { backgroundColor: '#0891b2' },
  btnAddText: { color: '#fff', fontWeight: '800', fontSize: 13.5 },
  btnDisabled: { opacity: 0.6 },
});
