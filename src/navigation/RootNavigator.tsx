import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import OpenOrdersScreen from '../screens/OpenOrdersScreen';
import OrderMenuScreen from '../screens/OrderMenuScreen';
import AddPaxScreen from '../screens/AddPaxScreen';
import AddTransportScreen from '../screens/AddTransportScreen';
import EditPaxListScreen from '../screens/EditPaxListScreen';
import EditPaxScreen from '../screens/EditPaxScreen';
import DelayScreen from '../screens/DelayScreen';
import CreateOrderScreen from '../screens/CreateOrderScreen';
import BitacoraScreen from '../screens/BitacoraScreen';
import ResumenScreen from '../screens/ResumenScreen';
import VuelosScreen from '../screens/VuelosScreen';
import DetallesListScreen from '../screens/DetallesListScreen';
import DetalleOrdenScreen from '../screens/DetalleOrdenScreen';
import ReportesListScreen from '../screens/ReportesListScreen';
import ReportePickerScreen from '../screens/ReportePickerScreen';
import ComingSoonScreen from '../screens/ComingSoonScreen';
import { colors } from '../theme/colors';
import type { ExistingPaxDTO } from '../api/client';

export type OrderMenuParams = {
  folio: number;
  idAirport: number;
  folioDisplay: string;
  iata: string;
  typeAirline: string;
  airline?: string;
  flight?: string | null;
};

export type AddTransportParams = OrderMenuParams & { direction: 'in' | 'out' };
export type EditPaxParams = OrderMenuParams & { pax: ExistingPaxDTO };
export type DelayParams = OrderMenuParams;

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  CreateOrder: undefined;
  OpenOrders: undefined;
  OrderMenu: OrderMenuParams;
  AddPax: OrderMenuParams;
  AddTransport: AddTransportParams;
  EditPaxList: OrderMenuParams;
  EditPax: EditPaxParams;
  Delay: DelayParams;
  Bitacora: undefined;
  Resumen: undefined;
  Vuelos: undefined;
  DetallesList: undefined;
  DetalleOrden: { folio: number; idAirport: number; folioDisplay: string };
  ReportesList: undefined;
  ReportePicker: { folio: number; idAirport: number; folioDisplay: string };
  ComingSoon: { title: string; icon?: ComponentProps<typeof Ionicons>['name'] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.navy },
};

export default function RootNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy }}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
            <Stack.Screen name="OpenOrders" component={OpenOrdersScreen} />
            <Stack.Screen name="OrderMenu" component={OrderMenuScreen} />
            <Stack.Screen name="AddPax" component={AddPaxScreen} />
            <Stack.Screen name="AddTransport" component={AddTransportScreen} />
            <Stack.Screen name="EditPaxList" component={EditPaxListScreen} />
            <Stack.Screen name="EditPax" component={EditPaxScreen} />
            <Stack.Screen name="Delay" component={DelayScreen} />
            <Stack.Screen name="Bitacora" component={BitacoraScreen} />
            <Stack.Screen name="Resumen" component={ResumenScreen} />
            <Stack.Screen name="Vuelos" component={VuelosScreen} />
            <Stack.Screen name="DetallesList" component={DetallesListScreen} />
            <Stack.Screen name="DetalleOrden" component={DetalleOrdenScreen} />
            <Stack.Screen name="ReportesList" component={ReportesListScreen} />
            <Stack.Screen name="ReportePicker" component={ReportePickerScreen} />
            <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
