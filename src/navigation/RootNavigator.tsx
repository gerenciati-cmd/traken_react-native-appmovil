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
import ComingSoonScreen from '../screens/ComingSoonScreen';
import { colors } from '../theme/colors';

export type OrderMenuParams = {
  folio: number;
  idAirport: number;
  folioDisplay: string;
  iata: string;
  typeAirline: string;
};

export type AddTransportParams = OrderMenuParams & { direction: 'in' | 'out' };

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  OpenOrders: undefined;
  OrderMenu: OrderMenuParams;
  AddPax: OrderMenuParams;
  AddTransport: AddTransportParams;
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
            <Stack.Screen name="OpenOrders" component={OpenOrdersScreen} />
            <Stack.Screen name="OrderMenu" component={OrderMenuScreen} />
            <Stack.Screen name="AddPax" component={AddPaxScreen} />
            <Stack.Screen name="AddTransport" component={AddTransportScreen} />
            <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
