import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, gradients, radii, shadow } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getOpenOrders } from '../api/client';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type IconName = ComponentProps<typeof Ionicons>['name'];

type ModuleCard = {
  key: string;
  label: string;
  icon: IconName;
  gradient: readonly [string, string];
  onPress: () => void;
  badge?: number;
};

/**
 * Panel principal (equivalente al dashboard de op/index.php en la web): un
 * grid de accesos a cada modulo. Los que ya estan construidos navegan a la
 * pantalla real; los pendientes navegan a "Coming Soon" para que la
 * navegacion quede completa desde ya, sin fingir que algo esta terminado.
 */
const ADMIN_MAESTRO_EMAIL = 'fvazconcelos@traken.mx';

export default function HomeScreen({ navigation }: Props) {
  const { user, stations, logout } = useAuth();
  const [openCount, setOpenCount] = useState<number | null>(null);
  const esAdminMaestro = user?.email?.toLowerCase() === ADMIN_MAESTRO_EMAIL;

  useEffect(() => {
    getOpenOrders()
      .then((res) => {
        if (res.ok) setOpenCount(res.total ?? 0);
      })
      .catch(() => {});
  }, []);

  const goComingSoon = (title: string, icon: IconName) => () =>
    navigation.navigate('ComingSoon', { title, icon });

  const cards: ModuleCard[] = [
    {
      key: 'crear',
      label: 'Crear O.S',
      icon: 'document-text-outline',
      gradient: ['#2563eb', '#1d4ed8'],
      onPress: () => navigation.navigate('CreateOrder'),
    },
    {
      key: 'abiertos',
      label: 'O.S Abiertos',
      icon: 'checkmark-circle-outline',
      gradient: ['#16a34a', '#0f7a37'],
      onPress: () => navigation.navigate('OpenOrders'),
      badge: openCount ?? undefined,
    },
    {
      key: 'detalles',
      label: 'Detalles O.S',
      icon: 'albums-outline',
      gradient: ['#0891b2', '#0e7490'],
      onPress: () => navigation.navigate('DetallesList'),
    },
    {
      key: 'reportes',
      label: 'Reportes',
      icon: 'bar-chart-outline',
      gradient: ['#7c3aed', '#6d28d9'],
      onPress: goComingSoon('Reportes', 'bar-chart-outline'),
    },
    {
      key: 'editar',
      label: 'Editar O.S',
      icon: 'create-outline',
      gradient: ['#d97706', '#b45309'],
      onPress: goComingSoon('Editar O.S', 'create-outline'),
    },
    {
      key: 'resumen',
      label: 'Resumen por Estación',
      icon: 'stats-chart-outline',
      gradient: ['#0891b2', '#155e75'],
      onPress: () => navigation.navigate('Resumen'),
    },
    {
      key: 'vuelos',
      label: 'Vuelos en Tiempo Real',
      icon: 'paper-plane-outline',
      gradient: ['#0891b2', '#0e7490'],
      onPress: () => navigation.navigate('Vuelos'),
    },
    ...(esAdminMaestro
      ? [
          {
            key: 'bitacora',
            label: 'Bitácora',
            icon: 'shield-checkmark-outline' as IconName,
            gradient: ['#334155', '#1e293b'] as readonly [string, string],
            onPress: () => navigation.navigate('Bitacora'),
          },
        ]
      : []),
  ];

  return (
    <LinearGradient colors={gradients.hero} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.hi}>Hola, {user?.firstname}</Text>
              <Text style={styles.role}>{user?.role_name}</Text>
            </View>
            <Pressable style={styles.logoutBtn} onPress={logout} hitSlop={8}>
              <Ionicons name="log-out-outline" size={20} color={colors.white} />
            </Pressable>
          </View>

          {stations.length > 0 ? (
            <View style={styles.stationsWrap}>
              {stations.slice(0, 6).map((s) => (
                <View key={s.id} style={styles.stationChip}>
                  <Text style={styles.stationChipText}>{s.iata}</Text>
                </View>
              ))}
              {stations.length > 6 ? (
                <View style={[styles.stationChip, styles.stationChipMore]}>
                  <Text style={styles.stationChipText}>+{stations.length - 6}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.grid}>
            {cards.map((c) => (
              <Pressable key={c.key} style={[styles.card, shadow.card]} onPress={c.onPress}>
                {!!c.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{c.badge}</Text>
                  </View>
                )}
                <LinearGradient colors={c.gradient} style={styles.iconBadge}>
                  <Ionicons name={c.icon} size={24} color={colors.white} />
                </LinearGradient>
                <Text style={styles.cardLabel}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  stationsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 22 },
  stationChip: {
    backgroundColor: 'rgba(43,183,179,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(43,183,179,0.4)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stationChipMore: {
    backgroundColor: 'rgba(245,158,11,0.14)',
    borderColor: 'rgba(245,158,11,0.4)',
  },
  stationChipText: { color: colors.teal, fontWeight: '800', fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: { color: colors.white, fontSize: 12.5, fontWeight: '700', textAlign: 'center' },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 10.5, fontWeight: '800' },
});
