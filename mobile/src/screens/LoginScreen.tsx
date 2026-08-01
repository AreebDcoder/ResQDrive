import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
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

export default function LoginScreen({ navigation }: { navigation: any }) {
  const dispatch = useDispatch();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Entrance animations
  const cardY = useRef(new Animated.Value(24)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(16)).current;

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
      setErrorMsg(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />
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
                  <Text style={styles.logoEmoji}>🛡️</Text>
                </View>
                <Text style={styles.brandText}>
                  ResQ<Text style={styles.brandAccent}>Drive</Text>
                </Text>
              </View>
              <Text style={styles.title}>Welcome Back</Text>
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
                  <Text style={styles.errorIcon}>⚠</Text>
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
                    <Text style={styles.inputIcon}>✉</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter email or phone number"
                      placeholderTextColor="#6B6B80"
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
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Enter your password"
                      placeholderTextColor="#6B6B80"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      onBlur={() => { onBlur(); setFocusedField(null); }}
                      onChangeText={onChange}
                      onFocus={() => setFocusedField('password')}
                      value={value}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Text style={styles.eyeBtnText}>
                        {showPassword ? '🙈' : '👁'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.password && (
                <Text style={styles.errorHelper}>{errors.password.message}</Text>
              )}

              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotText}>Forgot Password? →</Text>
              </TouchableOpacity>

              {/* CTA Button with layered gradient effect */}
              <TouchableOpacity
                style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
                onPress={handleSubmit(onSubmit)}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <View style={styles.loginBtnGradient} />
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
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
              <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
                <Text style={styles.socialIcon}>G</Text>
                <Text style={styles.socialLabel}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn} activeOpacity={0.7}>
                <Text style={styles.socialIcon}>🍎</Text>
                <Text style={styles.socialLabel}>Apple</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
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
    backgroundColor: '#0A0A0F',
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
    backgroundColor: 'rgba(229, 57, 53, 0.07)',
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
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(229, 57, 53, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#E53935',
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
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandAccent: {
    color: '#E53935',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#A0A0B8',
  },
  formCard: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 23, 68, 0.1)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.3)',
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 13,
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: '#A0A0B8',
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 8,
  },
  inputFocused: {
    borderColor: '#E53935',
    backgroundColor: 'rgba(229, 57, 53, 0.05)',
  },
  inputError: {
    borderColor: '#FF1744',
    borderWidth: 1.5,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  input: {
    color: '#FFFFFF',
    fontSize: 15,
    padding: 0,
  },
  errorHelper: {
    color: '#FF5252',
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
    color: '#2979FF',
    fontSize: 13,
    fontWeight: '600',
  },
  loginBtn: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  loginBtnGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E53935',
  },
  loginBtnDisabled: {
    opacity: 0.55,
  },
  loginBtnText: {
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    color: '#6B6B80',
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  socialIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  socialLabel: {
    color: '#A0A0B8',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    color: '#6B6B80',
    fontSize: 14,
  },
  signupText: {
    color: '#2979FF',
    fontSize: 14,
    fontWeight: '700',
  },
});