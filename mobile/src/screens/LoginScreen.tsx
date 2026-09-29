import React, { useState, useRef, useEffect } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { loginSchema, LoginInput } from '../schemas/validation';
import { loginSuccess } from '../store/slices/authSlice';
import api from '../api/axios';
import { setItemAsync } from '../utils/secureStorage';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../components/ui/Toast';
import { colors, darkColors, tints } from '../theme/tokens';

export default function LoginScreen({ navigation }: { navigation: any }) {
  const toast = useToast();
  const dispatch = useDispatch();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Entrance animations
  const cardY = useRef(new Animated.Value(24)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(16)).current;

  // Google Sign-In config
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '', // ← REPLACE with your actual Web Client ID from Google Cloud Console
      offlineAccess: false,
    });
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(cardY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrPhone: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setErrorMsg(null);
    Keyboard.dismiss();
    try {
      const response = await api.post('/auth/login', data);
      const { accessToken, refreshToken, user } = response.data;

      await setItemAsync('refreshToken', refreshToken);
      dispatch(loginSuccess({ accessToken, user }));
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      if (typeof msg === 'string' && msg.includes('EMAIL_NOT_VERIFIED')) {
        setErrorMsg('Your account is not verified yet. Redirecting to verification...');
        setTimeout(() => {
          navigation.navigate('EmailVerification', { email: data.emailOrPhone });
        }, 1200);
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Google Sign-In Handler ───────────────────────────────
  const onGoogleSignIn = async () => {
  try {
    setIsGoogleLoading(true);
    setErrorMsg(null);
   

    await GoogleSignin.hasPlayServices();
    

    const userInfo = await GoogleSignin.signIn();
    

    const idToken = userInfo.data?.idToken;

    if (!idToken) {
      toast.error('Failed to get Google ID token');
      return;
    }
 

    const res = await api.post('/auth/google', { idToken });
    console.log('✅ Backend response:', JSON.stringify(res.data));

         if (res.data?.accessToken) {
        const { accessToken, refreshToken, user } = res.data;
        await setItemAsync('refreshToken', refreshToken);
        dispatch(loginSuccess({ accessToken, user }));
    } else if (res.data?.newUser) {
      navigation.navigate('Register', {
        googleData: {
          fullName: userInfo.data?.user?.name || '',
          email: userInfo.data?.user?.email || '',
          profilePictureUrl: userInfo.data?.user?.photo || '',
        },
      });
    }
  } catch (error: any) {
    console.log('❌ Google Sign-In error:', error.code, error.message, error.response?.data);
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      // User cancelled
    } else {
      Alert.alert('Google Sign-In Error', error.message || 'Something went wrong');
    }
  } finally {
    setIsGoogleLoading(false);
  }
};

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessibilityRole="button">
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={darkColors.background} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Background glow */}
            <View style={styles.bgGlow} />

            {/* Header */}
            <Animated.View
              style={[
                styles.header,
                {
                  opacity: headerOpacity,
                  transform: [{ translateY: headerTranslateY }],
                },
              ]}
            >
              {/* Logo mark */}
              <View style={styles.logoRow}>
                <View style={styles.logoBadge}>
                  <Ionicons name="shield-checkmark" size={24} color={colors.danger[500]} />
                </View>
                <Text style={styles.brandText} accessibilityRole="header">
                  ResQ<Text style={styles.brandAccent}>Drive</Text>
                </Text>
              </View>
              <Text style={styles.title} accessibilityRole="header">Welcome Back</Text>
              <Text style={styles.subtitle}>Log in to your ResQDrive account</Text>
            </Animated.View>

            {/* Glass Card */}
            <Animated.View
              style={[
                styles.formCard,
                {
                  transform: [{ translateY: cardY }],
                  opacity: cardOpacity,
                },
              ]}
            >
              {/* Error */}
              {errorMsg && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={18} color={colors.danger[400]} style={{ marginRight: 6 }} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              <Text style={styles.label}>Email or Phone Number</Text>
              <Controller
                control={control}
                name="emailOrPhone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === 'email' && styles.inputFocused,
                      errors.emailOrPhone && styles.inputError,
                    ]}
                  >
                    <Ionicons name="mail-outline" size={18} color={darkColors.textTertiary} style={{ marginRight: 10 }} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter email or phone number"
                      placeholderTextColor={darkColors.textTertiary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onBlur={() => { onBlur(); setFocusedField(null); }}
                      onChangeText={onChange}
                      onFocus={() => setFocusedField('email')}
                      value={value}
                    />
                  </View>
                )}
              />
              {errors.emailOrPhone && (
                <Text style={styles.errorHelper}>{errors.emailOrPhone.message}</Text>
              )}

              <Text style={styles.label}>Password</Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    style={[
                      styles.inputWrapper,
                      focusedField === 'password' && styles.inputFocused,
                      errors.password && styles.inputError,
                    ]}
                  >
                    <Ionicons name="lock-closed-outline" size={18} color={darkColors.textTertiary} style={{ marginRight: 10 }} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Enter your password"
                      placeholderTextColor={darkColors.textTertiary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      onBlur={() => { onBlur(); setFocusedField(null); }}
                      onChangeText={onChange}
                      onFocus={() => setFocusedField('password')}
                      value={value}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowPassword(!showPassword)} accessibilityRole="button"
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={darkColors.textTertiary}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.password && (
                <Text style={styles.errorHelper}>{errors.password.message}</Text>
              )}

              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => navigation.navigate('ForgotPassword')} accessibilityRole="button"
              >
                <Text style={styles.forgotText}>Forgot Password? →</Text>
              </TouchableOpacity>

              {/* CTA Button with layered gradient effect */}
              <TouchableOpacity
                style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={isLoading}
                activeOpacity={0.85} accessibilityRole="button"
              >
                <View style={styles.loginBtnGradient} />
                {isLoading ? (
                  <ActivityIndicator color={darkColors.text} />
                ) : (
                  <Text style={styles.loginBtnText}>Log In</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity
                style={[styles.socialBtn, isGoogleLoading && styles.socialBtnDisabled]}
                onPress={onGoogleSignIn}
                disabled={isGoogleLoading}
                activeOpacity={0.7} accessibilityRole="button"
              >
                {isGoogleLoading ? (
                  <ActivityIndicator size="small" color={darkColors.text} />
                ) : (
                  <Text style={styles.socialIcon}>G</Text>
                )}
                <Text style={styles.socialLabel}>
                  {isGoogleLoading ? 'Signing in...' : 'Google'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')} accessibilityRole="button">
                <Text style={styles.signupText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  bgGlow: {
    position: 'absolute',
    top: -100,
    left: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: tints.overlayBrand,
  },
  header: {
    marginBottom: 32,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: tints.dangerLight,
    borderWidth: 1.5,
    borderColor: tints.dangerMedium,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  logoEmoji: {
    fontSize: 20,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '700',
    color: darkColors.text,
    letterSpacing: 0.5,
  },
  brandAccent: {
    color: colors.danger[500],
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: darkColors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: darkColors.textSecondary,
  },
  formCard: {
    backgroundColor: tints.glassCard,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
    marginBottom: 24,
    shadowColor: colors.neutral[950],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tints.dangerErrorBg,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tints.dangerErrorBorder,
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  errorText: {
    color: colors.danger[400],
    fontSize: 13,
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: darkColors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tints.whiteSubtle,
    borderWidth: 1,
    borderColor: tints.whiteBorderStrong,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 8,
  },
  inputFocused: {
    borderColor: colors.danger[500],
    backgroundColor: tints.dangerSubtle,
  },
  inputError: {
    borderColor: colors.danger[500],
    borderWidth: 1.5,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  input: {
    color: darkColors.text,
    fontSize: 15,
    padding: 0,
  },
  errorHelper: {
    color: colors.danger[400],
    fontSize: 12,
    marginTop: -4,
    marginBottom: 12,
    marginLeft: 4,
  },
  eyeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  eyeBtnText: {
    fontSize: 18,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotText: {
    color: colors.info[500],
    fontSize: 13,
    fontWeight: '600',
  },
  loginBtn: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  loginBtnGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.danger[500],
  },
  loginBtnDisabled: {
    opacity: 0.55,
  },
  loginBtnText: {
    color: darkColors.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    zIndex: 1,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: tints.whiteBorderStrong,
  },
  dividerText: {
    color: darkColors.textTertiary,
    fontSize: 12,
    paddingHorizontal: 16,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    backgroundColor: tints.whiteSubtle,
    borderWidth: 1,
    borderColor: tints.whiteBorderStrong,
    gap: 8,
  },
  socialBtnDisabled: {
    opacity: 0.5,
  },
  socialIcon: {
    fontSize: 18,
    color: darkColors.text,
    fontWeight: '700',
  },
  socialLabel: {
    color: darkColors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: darkColors.textTertiary,
    fontSize: 14,
  },
  signupText: {
    color: colors.info[500],
    fontSize: 14,
    fontWeight: '700',
  },
});