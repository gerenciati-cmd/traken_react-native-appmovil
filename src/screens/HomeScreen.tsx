import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, gradients, radii, shadow } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function HomeScreen() {
  const { username, logout } = useAuth();

  return (
    <LinearGradient colors={gradients.hero} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.content}>
          <View style={[styles.card, shadow.card]}>
            <View style={styles.iconBadge}>
              <Ionicons name="checkmark-circle" size={30} color={colors.teal} />
            </View>
            <Text style={styles.title}>¡Sesión iniciada!</Text>
            <Text style={styles.subtitle}>Bienvenido, {username}</Text>

            <Pressable style={styles.logoutBtn} onPress={logout}>
              <Ionicons name="log-out-outline" size={18} color={colors.white} />
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 28,
    alignItems: 'center',
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(43,183,179,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { color: colors.white, fontSize: 20, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 6, marginBottom: 24 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.button,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  logoutText: { color: colors.white, fontSize: 14, fontWeight: '600' },
});
