import React, { useState, useRef, useEffect } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, ResetPasswordInput } from '../schemas/validation';
import api from '../api/axios';
import { colors, darkColors, tints } from '../theme/tokens';

export default function ResetPasswordScreen({ navigation }: { navigation: any }) {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Batch 7 Phase 4: Respect Reduce Motion accessibility setting
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Skip decorative entrance animation when Reduce Motion is enabled
    if (reduceMotion) {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, reduceMotion]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.post('/auth/reset-password', {
        token: data.token.trim(),
        password: data.password,
      });
      setSuccessMsg('Password reset successful! You can now log in.');
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Password reset failed. Token may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={StyleSheet.absoluteFillObject}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: darkColors.background }]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradTop]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradBottom]} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header" allowFontScaling={true} maxFontSizeMultiplier={1.5}>Reset Password</Text>
            <Text style={styles.subtitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Enter the reset token sent to your email and your new password</Text>
          </View>

          {errorMsg && (
            <View style={styles.alertError}>
              <Text style={styles.alertText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errorMsg}</Text>
            </View>
          )}

          {successMsg && (
            <View style={styles.alertSuccess}>
              <Text style={styles.successText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{successMsg}</Text>
            </View>
          )}

          <View style={styles.form}>
            <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Reset Token</Text>
            <Controller
              control={control}
              name="token"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.token && styles.inputError]}
                  placeholder="Enter reset token"
                  placeholderTextColor={darkColors.textTertiary}
                  autoCapitalize="none"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  allowFontScaling={true}
                  maxFontSizeMultiplier={1.5}
                />
              )}
            />
            {errors.token && <Text style={styles.errorHelper} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errors.token.message}</Text>}

            <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>New Password</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="At least 8 characters, 1 number, 1 special char"
                    placeholderTextColor={darkColors.textTertiary}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.5}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)} accessibilityRole="button">
                    <Text style={styles.eyeBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.password && <Text style={styles.errorHelper} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errors.password.message}</Text>}

            <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Confirm New Password</Text>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.passwordContainer, errors.confirmPassword && styles.inputError]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm your new password"
                    placeholderTextColor={darkColors.textTertiary}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.5}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)} accessibilityRole="button"
                  >
                    <Text style={styles.eyeBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.confirmPassword && <Text style={styles.errorHelper} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errors.confirmPassword.message}</Text>}

            <TouchableOpacity style={styles.resetBtn} onPress={handleSubmit(onSubmit)} disabled={isLoading} accessibilityRole="button">
              {isLoading ? (
                <ActivityIndicator color={darkColors.text} />
              ) : (
                <Text style={styles.resetBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')} accessibilityRole="button">
            <Text style={styles.backText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Back to Log In</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkColors.background },
  gradTop: { top: 0, height: 300, backgroundColor: tints.dangerSubtle },
  gradBottom: { bottom: 0, height: 400, backgroundColor: tints.infoSubtle },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', paddingBottom: 40 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: darkColors.text },
  subtitle: { fontSize: 15, color: darkColors.textSecondary, marginTop: 10, lineHeight: 22 },
  alertError: {
    backgroundColor: tints.dangerErrorBg, padding: 12, borderRadius: 14,
    borderWidth: 1, borderColor: tints.dangerErrorBorder, marginBottom: 20,
  },
  alertSuccess: {
    backgroundColor: tints.successSubtle, padding: 12, borderRadius: 14,
    borderWidth: 1, borderColor: tints.successMedium, marginBottom: 20,
  },
  alertText: { color: colors.danger[300], fontSize: 14, textAlign: 'center' },
  successText: { color: colors.success[500], fontSize: 14, textAlign: 'center' },
  form: { width: '100%' },
  label: { fontSize: 14, color: darkColors.textSecondary, marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: tints.glassCard, color: darkColors.text, paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: tints.whiteBorder,
    shadowColor: colors.neutral[950], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  inputError: { borderColor: tints.dangerErrorBorder },
  errorHelper: { color: colors.danger[300], fontSize: 12, marginTop: -10, marginBottom: 16 },
  resetBtn: {
    backgroundColor: colors.danger[500], paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 10,
    shadowColor: colors.danger[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  resetBtnText: { color: darkColors.text, fontSize: 16, fontWeight: 'bold' },
  backBtn: { alignItems: 'center', marginTop: 28 },
  backText: { color: darkColors.textSecondary, fontSize: 14, fontWeight: '600' },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: tints.glassCard,
    borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: tints.whiteBorder, paddingRight: 16,
    shadowColor: colors.neutral[950], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  passwordInput: { flex: 1, color: darkColors.text, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  eyeBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  eyeBtnText: { color: colors.danger[500], fontSize: 13, fontWeight: 'bold' },
});