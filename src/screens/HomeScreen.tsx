import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, gradients, radii, shadow } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { getNotifications, getOpenOrders } from '../api/client';
import { getLastSeenNotifications } from '../utils/notificationsSeen';
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
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const esAdminMaestro = user?.email?.toLowerCase() === ADMIN_MAESTRO_EMAIL;

  const loadHeader = useCallback(async () => {
    try {
      const res = await getOpenOrders();
      if (res.ok) setOpenCount(res.total ?? 0);
    } catch (e) {
      // Silencioso: es solo el numero del badge, no bloquea el resto de Home.
    }
    try {
      const [notifRes, lastSeen] = await Promise.all([getNotifications(1), getLastSeenNotifications()]);
      const latest = notifRes.ok ? notifRes.items?.[0]?.sent_at : null;
      const latestTs = latest ? Date.parse(latest.replace(' ', 'T')) : 0;
      setHasUnreadNotifs(latestTs > lastSeen);
    } catch (e) {
      // Silencioso: el puntito de notificaciones es un extra, no critico.
    }
  }, []);

  // Se re-checa al volver a esta pantalla (ej. despues de abrir
  // Notificaciones) para que el puntito rojo desaparezca sin tener que
  // cerrar y reabrir la app.
  useFocusEffect(
    useCallback(() => {
      loadHeader();
    }, [loadHeader])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadHeader();
    setIsRefreshing(false);
  };

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
      onPress: () => navigation.navigate('ReportesList'),
    },
    {
      key: 'editar',
      label: 'Editar O.S',
      icon: 'create-outline',
      gradient: ['#d97706', '#b45309'],
      onPress: () => navigation.navigate('EditarList'),
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
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.teal} />
          }
        >
          <View style={styles.topRow}>
            <View>
              <Text style={styles.hi}>Hola, {user?.firstname}</Text>
              <Text style={styles.role}>{user?.role_name}</Text>
            </View>
            <View style={styles.topActions}>
              <Pressable
                style={styles.iconBtn}
                onPress={() => navigation.navigate('Notifications')}
                hitSlop={8}
                android_ripple={{ color: 'rgba(255,255,255,0.15)', radius: 22, borderless: true }}
              >
                <Ionicons name="notifications-outline" size={20} color={colors.white} />
                {hasUnreadNotifs && <View style={styles.unreadDot} />}
              </Pressable>
              <Pressable
                style={styles.iconBtn}
                onPress={logout}
                hitSlop={8}
                android_ripple={{ color: 'rgba(255,255,255,0.15)', radius: 22, borderless: true }}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.white} />
              </Pressable>
            </View>
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
              <Pressable
                key={c.key}
                style={({ pressed }) => [styles.card, shadow.card, pressed && Platform.OS === 'ios' && styles.cardPressed]}
                onPress={c.onPress}
                android_ripple={{ color: 'rgba(255,255,255,0.08)' }}
              >
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
  topActions: { flexDirection: 'row', gap: 10 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.navy,
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
  cardPressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
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
