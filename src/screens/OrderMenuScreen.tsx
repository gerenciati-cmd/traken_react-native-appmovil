import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, gradients, radii, shadow } from '../theme/colors';
import { cancelOrder, closeOrder, sendOrderEmail } from '../api/client';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderMenu'>;
type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Equivalente movil de op/modulos/open/submenu.php (la pantalla que abre
 * "Agregar" en cada tarjeta de Ordenes Abiertas en la web): un menu de
 * acciones por O.S. Igual que en Home, lo que ya esta construido navega a
 * la accion real; lo pendiente va a "Coming Soon" para no fingir que algo
 * esta listo.
 */
export default function OrderMenuScreen({ route, navigation }: Props) {
  const { folio, idAirport, folioDisplay, iata, typeAirline } = route.params;
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const goComingSoon = (title: string, icon: IconName) => () =>
    navigation.navigate('ComingSoon', { title, icon });

  const handleClose = () => {
    Alert.alert(
      'Cerrar Orden de Servicio',
      `¿Cerrar la O.S. ${folioDisplay}? Se requiere transporte de salida registrado y todos los pasajeros con nombre y fecha de salida completos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar O.S.',
          onPress: async () => {
            setIsClosing(true);
            try {
              const res = await closeOrder(folio, idAirport);
              if (res.ok) {
                Alert.alert('O.S. cerrada', res.msg ?? '', [
                  { text: 'OK', onPress: () => navigation.navigate('OpenOrders') },
                ]);
              } else {
                const reasons = res.reasons?.length ? '\n\n• ' + res.reasons.join('\n• ') : '';
                Alert.alert('No se pudo cerrar', (res.error ?? 'Faltan requisitos.') + reasons);
              }
            } catch (e) {
              Alert.alert('Sin conexión', 'No se pudo cerrar la O.S. Intenta de nuevo.');
            } finally {
              setIsClosing(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancelar Orden de Servicio',
      `Esta acción es difícil de revertir. ¿Seguro que quieres cancelar la O.S. ${folioDisplay}?`,
      [
        { text: 'No, mantener', style: 'cancel' },
        {
          text: 'Sí, cancelar O.S.',
          style: 'destructive',
          onPress: async () => {
            setIsCancelling(true);
            try {
              const res = await cancelOrder(folio, idAirport);
              if (res.ok) {
                Alert.alert('O.S. cancelada', res.msg ?? '', [
                  { text: 'OK', onPress: () => navigation.navigate('OpenOrders') },
                ]);
              } else {
                Alert.alert('No se pudo cancelar', res.error ?? res.msg ?? 'Intenta de nuevo.');
              }
            } catch (e) {
              Alert.alert('Sin conexión', 'No se pudo cancelar la O.S. Intenta de nuevo.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleSendEmail = () => {
    Alert.alert(
      'Enviar correo de la O.S.',
      `¿Enviar el correo con el detalle de la O.S. ${folioDisplay} a los destinatarios registrados?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: async () => {
            setIsSendingEmail(true);
            try {
              const res = await sendOrderEmail(folio, idAirport);
              Alert.alert(res.ok ? 'Enviado' : 'No se pudo enviar', res.msg ?? res.error ?? '');
            } catch (e) {
              Alert.alert('Sin conexión', 'No se pudo enviar el correo. Intenta de nuevo.');
            } finally {
              setIsSendingEmail(false);
            }
          },
        },
      ]
    );
  };

  const items: {
    key: string;
    label: string;
    sub: string;
    icon: IconName;
    color: string;
    onPress: () => void;
    loading?: boolean;
  }[] = [
    {
      key: 'pax',
      label: 'Pax',
      sub: 'Agregar pasajero',
      icon: 'person-add-outline',
      color: '#2563eb',
      onPress: () => navigation.navigate('AddPax', { folio, idAirport, folioDisplay, iata, typeAirline }),
    },
    {
      key: 'transp-in',
      label: 'Transp. Llegada',
      sub: 'Agregar transporte',
      icon: 'car-outline',
      color: '#0891b2',
      onPress: () =>
        navigation.navigate('AddTransport', { folio, idAirport, folioDisplay, iata, typeAirline, direction: 'in' }),
    },
    {
      key: 'transp-out',
      label: 'Transp. Salida',
      sub: 'Agregar transporte',
      icon: 'car-sport-outline',
      color: '#0891b2',
      onPress: () =>
        navigation.navigate('AddTransport', { folio, idAirport, folioDisplay, iata, typeAirline, direction: 'out' }),
    },
    {
      key: 'email',
      label: 'Enviar Correo O.S.',
      sub: 'A los destinatarios registrados',
      icon: 'mail-outline',
      color: '#7c3aed',
      onPress: handleSendEmail,
      loading: isSendingEmail,
    },
    {
      key: 'vouchers',
      label: 'Vouchers de esta O.S.',
      sub: 'Descargar comprobantes',
      icon: 'image-outline',
      color: '#0891b2',
      onPress: goComingSoon('Vouchers de esta O.S.', 'image-outline'),
    },
    {
      key: 'close',
      label: 'Cerrar Orden',
      sub: 'Requiere transporte y pax completos',
      icon: 'lock-closed-outline',
      color: '#16a34a',
      onPress: handleClose,
      loading: isClosing,
    },
    {
      key: 'cancel',
      label: 'Cancelar Orden',
      sub: 'Acción difícil de revertir',
      icon: 'close-circle-outline',
      color: '#dc2626',
      onPress: handleCancel,
      loading: isCancelling,
    },
  ];

  return (
    <LinearGradient colors={gradients.hero} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </Pressable>
          <View>
            <Text style={styles.topTitle}>#{folioDisplay}</Text>
            <Text style={styles.topSub}>{iata ? iata + ' · ' : ''}Acciones de la O.S.</Text>
          </View>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {items.map((it) => (
            <Pressable
              key={it.key}
              style={[styles.item, shadow.card]}
              onPress={it.onPress}
              disabled={it.loading}
            >
              <View style={[styles.itemIcon, { backgroundColor: it.color }]}>
                <Ionicons name={it.icon} size={20} color="#fff" />
              </View>
              <View style={styles.itemText}>
                <Text style={styles.itemLabel}>{it.label}</Text>
                <Text style={styles.itemSub}>{it.loading ? 'Procesando...' : it.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
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
    paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: colors.white, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  topSub: { color: colors.textMuted, fontSize: 11.5, textAlign: 'center', marginTop: 1 },
  content: { padding: 16, gap: 10 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 14,
    marginBottom: 10,
  },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1 },
  itemLabel: { color: colors.white, fontWeight: '800', fontSize: 13.5 },
  itemSub: { color: colors.textMuted, fontSize: 11.5, marginTop: 2 },
});
