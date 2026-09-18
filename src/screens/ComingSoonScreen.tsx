import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, gradients, radii, shadow } from '../theme/colors';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ComingSoon'>;

/**
 * Placeholder para los paneles del "op" que todavia no se construyen en el
 * movil (Crear O.S., Reportes, etc.). Mantiene la navegacion completa y
 * organizada desde ya, sin fingir que algo esta terminado cuando no lo esta.
 */
export default function ComingSoonScreen({ route, navigation }: Props) {
  const { title, icon } = route.params;

  return (
    <LinearGradient colors={gradients.hero} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <Text style={styles.topTitle}>{title}</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.content}>
          <View style={[styles.card, shadow.card]}>
            <View style={styles.iconBadge}>
              <Ionicons name={icon ?? 'construct-outline'} size={30} color={colors.teal} />
            </View>
            <Text style={styles.title}>Próximamente</Text>
            <Text style={styles.subtitle}>
              "{title}" se está construyendo aquí mismo, con los mismos datos y permisos que ya
              usas en la versión web.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
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
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: colors.white, fontSize: 15, fontWeight: '800' },
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
  title: { color: colors.white, fontSize: 18, fontWeight: '800' },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 19,
  },
});
