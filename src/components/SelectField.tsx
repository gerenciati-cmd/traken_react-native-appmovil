import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadow } from '../theme/colors';

export interface SelectOption {
  id: number;
  label: string;
}

type Props = {
  label: string;
  placeholder?: string;
  options: SelectOption[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  disabled?: boolean;
  emptyText?: string;
};

/**
 * Selector con buscador (equivalente movil del select2 que usa
 * op/modulos/create/inicio.php para Aeropuerto/Evento/Aerolinea/Hotel):
 * en vez de tirar TODAS las opciones como chips en la pantalla (ilegible en
 * estaciones con decenas de aerolineas u hoteles), se muestra un campo
 * compacto que abre una hoja con buscador -- se escribe para filtrar, se
 * toca una fila y listo.
 */
export default function SelectField({
  label,
  placeholder = 'Seleccionar',
  options,
  selectedId,
  onSelect,
  disabled,
  emptyText,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.id === selectedId);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const open = () => {
    if (disabled) return;
    setQuery('');
    setVisible(true);
  };

  return (
    <>
      <Pressable style={[styles.field, disabled && styles.fieldDisabled]} onPress={open}>
        <Text style={[styles.fieldText, !selected && styles.fieldPlaceholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={[styles.sheet, shadow.card]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={() => setVisible(false)} hitSlop={10}>
                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar..."
                placeholderTextColor={colors.placeholder}
                style={styles.searchInput}
                autoFocus
                autoCapitalize="none"
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(o) => String(o.id)}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={<Text style={styles.emptyText}>{emptyText ?? 'Sin resultados.'}</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.row, item.id === selectedId && styles.rowActive]}
                  onPress={() => {
                    onSelect(item.id);
                    setVisible(false);
                  }}
                >
                  <Text style={[styles.rowText, item.id === selectedId && styles.rowTextActive]} numberOfLines={2}>
                    {item.label}
                  </Text>
                  {item.id === selectedId && <Ionicons name="checkmark" size={18} color={colors.teal} />}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.inputBg,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    height: 46,
  },
  fieldDisabled: { opacity: 0.5 },
  fieldText: { color: colors.text, fontSize: 14, fontWeight: '700', flexShrink: 1, marginRight: 8 },
  fieldPlaceholder: { color: colors.placeholder, fontWeight: '500' },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.navy2,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
    maxHeight: '80%',
    minHeight: '45%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: { color: colors.white, fontSize: 15, fontWeight: '800' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.inputBg,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  list: { flexGrow: 0 },
  listContent: { paddingBottom: 10 },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 30 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  rowActive: { backgroundColor: 'rgba(43,183,179,0.14)' },
  rowText: { color: colors.text, fontSize: 14, flexShrink: 1, marginRight: 8 },
  rowTextActive: { color: colors.teal, fontWeight: '700' },
});
