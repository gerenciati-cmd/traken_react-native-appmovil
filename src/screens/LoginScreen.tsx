import React, { useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, gradients, radii, shadow } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login, isAuthenticating, error, clearError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'user' | 'pass' | null>(null);

  const pressScale = useRef(new Animated.Value(1)).current;
  const logoFade = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(24)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.timing(logoFade, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(cardFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(cardSlide, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !isAuthenticating;

  const handlePressIn = () =>
    Animated.spring(pressScale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  const handlePressOut = () =>
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await login(username.trim(), password);
  };

  return (
    <LinearGradient colors={gradients.hero} style={styles.flex} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.content}>
            <Animated.View style={[styles.brand, { opacity: logoFade }]}>
              <View style={styles.logoBadge}>
                <Ionicons name="airplane" size={28} color={colors.white} />
              </View>
              <Text style={styles.brandTitle}>TRAKEN</Text>
              <Text style={styles.brandSubtitle}>Operaciones · Ground Control</Text>
            </Animated.View>

            <Animated.View
              style={[
                styles.card,
                shadow.card,
                { opacity: cardFade, transform: [{ translateY: cardSlide }] },
              ]}
            >
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <Text style={styles.welcome}>Bienvenido de nuevo</Text>
              <Text style={styles.welcomeSub}>Inicia sesión para continuar tu operación</Text>

              {error ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View
                style={[
                  styles.inputWrap,
                  focusedField === 'user' && styles.inputWrapFocused,
                ]}
              >
                <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                <TextInput
                  value={username}
                  onChangeText={(t) => {
                    setUsername(t);
                    if (error) clearError();
                  }}
                  onFocus={() => setFocusedField('user')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Usuario o correo"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  returnKeyType="next"
                />
              </View>

              <View
                style={[
                  styles.inputWrap,
                  focusedField === 'pass' && styles.inputWrapFocused,
                ]}
              >
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                <TextInput
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (error) clearError();
                  }}
                  onFocus={() => setFocusedField('pass')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Contraseña"
                  placeholderTextColor={colors.placeholder}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textMuted}
                  />
                </Pressable>
              </View>

              <Pressable style={styles.forgotWrap} hitSlop={8}>
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
              </Pressable>

              <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                <Animated.View style={{ transform: [{ scale: pressScale }] }}>
                  <LinearGradient
                    colors={canSubmit ? gradients.primaryButton : ['#3a4360', '#3a4360']}
                    style={styles.button}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isAuthenticating ? (
                      <Text style={styles.buttonText}>Verificando…</Text>
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Ingresar</Text>
                        <Ionicons name="arrow-forward" size={18} color={colors.white} />
                      </>
                    )}
                  </LinearGradient>
                </Animated.View>
              </Pressable>
            </Animated.View>

            <Text style={styles.footer}>APS · Above All We Care</Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  brandTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
  },
  brandSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: radii.card,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  welcome: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  welcomeSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(220,38,38,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.35)',
    borderRadius: radii.input,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ffb4bb',
    fontSize: 12.5,
    flexShrink: 1,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.inputBg,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 14,
  },
  inputWrapFocused: {
    borderColor: colors.teal,
    backgroundColor: 'rgba(43,183,179,0.10)',
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotText: {
    color: colors.teal,
    fontSize: 12.5,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: radii.button,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15.5,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    color: 'rgba(244,246,251,0.35)',
    fontSize: 11.5,
    marginTop: 28,
    letterSpacing: 0.5,
  },
});
