import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, Fingerprint } from 'lucide-react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Svg, { Path } from 'react-native-svg';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { colors } = useTheme();

  // helpers for color mixing and conversion
  const mixColors = (c1: string, c2: string) => {
    const hex = (h: string) => h.replace('#', '');
    const p1 = hex(c1);
    const p2 = hex(c2);
    const r = Math.round((parseInt(p1.slice(0, 2), 16) + parseInt(p2.slice(0, 2), 16)) / 2);
    const g = Math.round((parseInt(p1.slice(2, 4), 16) + parseInt(p2.slice(2, 4), 16)) / 2);
    const b = Math.round((parseInt(p1.slice(4, 6), 16) + parseInt(p2.slice(4, 6), 16)) / 2);
    const toHex = (v: number) => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const hexToRgba = (hex: string, alpha = 1) => {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Randomized decorative palette for wave fill/stroke and background blurs.
  const decor = useMemo(() => {
    const violet = colors.primaryGradientEnd;
    const purpleMix = mixColors(colors.primaryGradientStart, colors.primaryGradientEnd);
    const babyPink = '#ffb3d9';
    const lightPink = '#ffcceb';
    const signUpPink = '#ff69b4';
    const pool = [violet, purpleMix, babyPink];
    // shuffle
    pool.sort(() => Math.random() - 0.5);
    // assign in order; if fewer items needed than pool length, reuse
    const waveFill = colors.primaryGradientEnd;
    const waveStroke = colors.primaryGradientStart;
    const blur1 = lightPink;
    const blur2 = signUpPink;
    return { waveFill, waveStroke, blur1, blur2 };
  }, [colors.primaryGradientStart, colors.primaryGradientEnd]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  // animated values for the three dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') {
        // On web we can offer a WebAuthn-based demo if the browser supports it.
        const webAvailable = typeof window !== 'undefined' && (window.PublicKeyCredential !== undefined);
        setBiometricAvailable(!!webAvailable);
        return;
      }

      const compat = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compat && enrolled);
    })();

    // start animated dots loop
    const startLoop = (anim: Animated.Value, delay = 0) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: -8, duration: 300, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
          Animated.delay(150),
        ])
      ).start();
    };

    startLoop(dot1, 0);
    startLoop(dot2, 150);
    startLoop(dot3, 300);
  }, []);

  const handleBiometricAuth = async () => {
    if (Platform.OS === 'web') {
      // On web we route to WebAuthn demo authenticate which uses navigator.credentials
      return handleWebAuthenticate();
    }
    try {
      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
      });
      if (result.success) {
        setLoading(true);
        try {
          // Use default credentials when biometric succeeds
          await signIn('deepanalysis', 'internship@123');
          router.replace('/(tabs)');
        } catch (error: any) {
          Alert.alert('Login Failed', error?.message || 'Sign in failed');
        } finally {
          setLoading(false);
        }
      } else {
        Alert.alert('Authentication failed', 'Fingerprint authentication was cancelled or failed.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during authentication.');
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github' | 'linkedin') => {
    // Social logins are visible but disabled — they should NOT allow navigation.
    Alert.alert('Social login disabled', `${provider} sign-in is disabled. Use username/password to sign in.`);
  };

  // --- WebAuthn demo helpers (client-only, stores credential in localStorage) ---
  // helper: base64url <-> ArrayBuffer
  const bufferToBase64Url = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const base64UrlToBuffer = (base64url: string) => {
    const pad = (4 - (base64url.length % 4)) % 4;
    const base64 = (base64url + '='.repeat(pad)).replace(/-/g, '+').replace(/_/g, '/');
    const str = atob(base64);
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    return bytes.buffer;
  };

  const handleWebRegister = async () => {
    // WebAuthn registration is available as a demo but does not grant access in this build.
    Alert.alert('Disabled', 'Web authenticator registration is disabled. Use username/password to sign in.');
  };

  const handleWebAuthenticate = async () => {
    // WebAuthn authentication is disabled for navigation in this build.
    Alert.alert('Authentication disabled', 'Web authenticators cannot be used to sign in. Use username/password.');
  };

  const handleLogin = async () => {
    // Only allow the specified credentials to proceed.
    // Accept both the intended username and the older misspelling, case-insensitive.
    const allowedUsers = ['deepanalysis', 'deepanlaysis'];
    const allowedPass = 'internship@123';
    const normalizedUser = (email || '').trim().toLowerCase();
    if (!allowedUsers.includes(normalizedUser) || password !== allowedPass) {
      Alert.alert('Invalid credentials', 'Only the specified username and password can sign in.');
      return;
    }

    setLoading(true);
    try {
      // attempt the app's sign-in flow with provided credentials; if your backend is unavailable
      // this may fail — the gate is enforced locally regardless of backend success for navigation.
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      // Still show navigation only when credentials matched; if signIn fails, show error but do not navigate.
      Alert.alert('Login Failed', error?.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#0a192f", "#122240"]} style={styles.container}>
      {/* Background decorative elements - full coverage */}
      <View style={styles.decorative} pointerEvents="none">
        <View style={[styles.pinkBlur, { backgroundColor: decor.blur1, opacity: 0.5 }]} />
        <View style={[styles.violetBlur, { backgroundColor: decor.blur2, opacity: 0.18 }]} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, width: '100%', alignItems: 'center' }}>
        <View style={[styles.content, { paddingTop: 20 }]}>
          {/* Header with waves */}
          <View style={styles.headerWrap}>
            <View style={styles.waveContainer} pointerEvents="none">
              <Svg viewBox="0 0 500 150" preserveAspectRatio="xMidYMid slice" style={styles.wave}>
                <Path d="M0,100 C150,200 350,0 500,100 L500,0 L0,0 Z" fill={hexToRgba(decor.waveFill, 0.5)} />
              </Svg>
              <Svg viewBox="0 0 500 150" preserveAspectRatio="xMidYMid slice" style={[styles.wave, { position: 'absolute', top: 10 }] }>
                <Path d="M0,80 C150,180 300,30 500,80 L500,0 L0,0 Z" stroke={hexToRgba(decor.waveStroke, 0.45)} strokeWidth={1.5} fill="none" />
              </Svg>
            </View>

            <Text style={styles.brand}>DeepSpectrum</Text>
            <Text style={styles.brandSub}>Analytics Private Limited</Text>
            <View style={[styles.underlineGradient, { backgroundColor: '#ff69b4' }]} />
          </View>

          {/* Sign in form */}
          <View style={styles.formContainer}>
            <Text style={styles.signInTitle}>Sign in</Text>
            <View style={styles.signInUnderline} />

            <View style={styles.card}>
              <View style={styles.inputRow}>
                  <Mail size={20} color="#ff69b4" />
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#cbd5e1"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputRow}>
                  <Lock size={20} color="#ff69b4" />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#cbd5e1"
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 6 }}>
                  <Text style={{ color: '#cbd5e1' }}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.rowBetween}>
                <View style={styles.rememberRow}>
                  <TouchableOpacity style={styles.checkbox} />
                  <Text style={styles.rememberText}>Remember me</Text>
                </View>
                <TouchableOpacity>
                  <Text style={styles.forgot}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.signInButton} onPress={handleLogin} activeOpacity={0.9}>
                <LinearGradient colors={[colors.primaryGradientStart, colors.primaryGradientEnd]} style={styles.signInButtonInner}>
                  <Text style={styles.signInButtonText}>Sign in</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={{ marginTop: 12, alignItems: 'center' }}>
                <Text style={styles.noAccountText}>Do not have an account? <Text style={[styles.signUpText, { color: '#ff69b4' }]}>Sign up</Text></Text>
              </View>

              {/* Fingerprint access option (visible on mobile when available) */}
              {biometricAvailable && (
                <View style={{ alignItems: 'center', marginTop: 12 }}>
                  {Platform.OS === 'web' ? (
                    <>
                      <TouchableOpacity onPress={handleWebAuthenticate} accessibilityLabel="Use fingerprint (web)" style={styles.fingerprintButton} activeOpacity={0.85}>
                        <View style={[styles.fingerprintCircle, { borderColor: 'rgba(255,105,180,0.2)' }]}>
                          <Fingerprint size={28} color="#ff69b4" />
                        </View>
                        <Text style={styles.fingerprintText}>Use platform authenticator</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleWebRegister} accessibilityLabel="Register authenticator (web)" style={[styles.fingerprintButton, { marginTop: 8 }]} activeOpacity={0.85}>
                        <Text style={[styles.fingerprintText, { color: '#cbd5e1' }]}>Register demo authenticator</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity onPress={handleBiometricAuth} accessibilityLabel="Fingerprint sign in" style={styles.fingerprintButton} activeOpacity={0.85}>
                      <View style={[styles.fingerprintCircle, { borderColor: 'rgba(255,105,180,0.2)' }]}>
                        <Fingerprint size={28} color="#ff69b4" />
                      </View>
                      <Text style={styles.fingerprintText}>Fingerprint Access</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Looping bouncing dots */}
              <View style={{ justifyContent: 'center', alignItems: 'center', marginTop: 12 }}>
                <View style={styles.dotsRow}>
                  <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }], backgroundColor: '#ff69b4' }]} />
                  <Animated.View style={[styles.dot, { marginLeft: 6, transform: [{ translateY: dot2 }], backgroundColor: '#ff69b4' }]} />
                  <Animated.View style={[styles.dot, { marginLeft: 6, transform: [{ translateY: dot3 }], backgroundColor: '#ff69b4' }]} />
                </View>
              </View>
              
              {/* Social login buttons (demo) */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 14 }}>
                <TouchableOpacity onPress={() => handleSocialLogin('google')} style={[styles.socialButton, { backgroundColor: '#db4437' }]} accessibilityLabel="Sign in with Google">
                  <FontAwesome name="google" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleSocialLogin('linkedin')} style={[styles.socialButton, { backgroundColor: '#0a66c2', marginLeft: 12 }]} accessibilityLabel="Sign in with LinkedIn">
                  <FontAwesome name="linkedin" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleSocialLogin('github')} style={[styles.socialButton, { backgroundColor: '#333', marginLeft: 12 }]} accessibilityLabel="Sign in with GitHub">
                  <FontAwesome name="github" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a192f', alignItems: 'center' },
  content: { flex: 1, width: '100%', maxWidth: 600, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { flexGrow: 1, padding: 18, justifyContent: 'center', maxWidth: 600, width: '100%' },
  headerWrap: { alignItems: 'center', marginBottom: -40, width: '100%', zIndex: 1 },
  waveContainer: { width: '100%', height: 160, overflow: 'visible', marginBottom: 0 },
  wave: { width: '100%', height: '100%' },
  brand: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 6 },
  brandSub: { color: '#cbd5e1', marginTop: 2, fontSize: 12 },
  underlineGradient: { width: 80, height: 3, borderRadius: 999, marginTop: 6 },
  formContainer: { flex: 1, paddingHorizontal: 6, maxWidth: 520, width: '100%', alignSelf: 'center', justifyContent: 'center' },
  signInTitle: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
  signInUnderline: { width: 60, height: 2, borderRadius: 999, alignSelf: 'center', marginTop: 6, marginBottom: 10 },
  card: { backgroundColor: 'rgba(18,34,64,0.28)', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingVertical: 8, marginBottom: 10 },
  input: { marginLeft: 10, flex: 1, color: '#fff', paddingVertical: 4, fontSize: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 16, height: 16, borderRadius: 3, borderWidth: 1, borderColor: 'rgba(255,105,180,0.4)', marginRight: 6 },
  rememberText: { color: '#cbd5e1', fontSize: 12 },
  forgot: { color: '#cbd5e1', fontSize: 12 },
  signInButton: { marginTop: 10, borderRadius: 999, overflow: 'hidden' },
  signInButtonInner: { paddingVertical: 12, alignItems: 'center' },
  signInButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  noAccountText: { color: '#cbd5e1', fontSize: 12 },
  signUpText: { color: '#fff', fontWeight: '700' },
  decorative: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', overflow: 'hidden' },
  pinkBlur: { position: 'absolute', top: '35%', left: '-25%', width: 180, height: 180, borderRadius: 90, backgroundColor: '#ffcceb', opacity: 0.75 },
  violetBlur: { position: 'absolute', bottom: '20%', right: '-35%', width: 200, height: 200, borderRadius: 100, backgroundColor: 'linear-gradient(135deg, #ff99cc, #ffb3d9)', opacity: 0.28 },
  fingerprintButton: { alignItems: 'center', marginTop: 10 },
  fingerprintCircle: { width: 56, height: 56, borderRadius: 999, backgroundColor: '#122240', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  fingerprintText: { color: '#cbd5e1', marginTop: 6, fontSize: 12 },
  dotsRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 999, backgroundColor: '#ff69b4', transform: [{ translateY: 0 }] },
  socialButton: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});

