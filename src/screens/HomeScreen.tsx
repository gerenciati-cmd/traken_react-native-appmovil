import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, gradients, radii, shadow } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
  const { user, stations, logout } = useAuth();

  return (
    <LinearGradient colors={gradients.hero} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.hi}>Hola, {user?.firstname}</Text>
              <Text style={styles.role}>{user?.role_name}</Text>
            </View>
            <Pressable style={styles.logoutBtn} onPress={logout} hitSlop={8}>
              <Ionicons name="log-out-outline" size={20} color={colors.white} />
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Tus estaciones ({stations.length})</Text>
          <FlatList
            data={stations}
            keyExtractor={(s) => String(s.id)}
            numColumns={3}
            columnWrapperStyle={styles.stationRow}
            contentContainerStyle={styles.stationList}
            renderItem={({ item }) => (
              <View style={styles.stationChip}>
                <Text style={styles.stationChipText}>{item.iata}</Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No tienes estaciones asignadas.</Text>
            }
          />

          <View style={[styles.pendingCard, shadow.card]}>
            <Ionicons name="construct-outline" size={22} color={colors.teal} />
            <Text style={styles.pendingTitle}>Más módulos en camino</Text>
            <Text style={styles.pendingSub}>
              Órdenes Abiertas, Detalles O.S. y el resto del operativo se están construyendo aquí.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, padding: 20 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  hi: { color: colors.white, fontSize: 20, fontWeight: '800' },
  role: { color: colors.textMuted, fontSize: 12.5, marginTop: 2 },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  stationList: { paddingBottom: 8 },
  stationRow: { gap: 8, marginBottom: 8 },
  stationChip: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.button,
    paddingVertical: 10,
    alignItems: 'center',
  },
  stationChipText: { color: colors.teal, fontWeight: '800', fontSize: 12.5, letterSpacing: 0.5 },
  emptyText: { color: colors.textMuted, fontSize: 13 },
  pendingCard: {
    marginTop: 'auto',
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  pendingTitle: { color: colors.white, fontSize: 15, fontWeight: '700', marginTop: 4 },
  pendingSub: { color: colors.textMuted, fontSize: 12.5, textAlign: 'center', lineHeight: 18 },
});
