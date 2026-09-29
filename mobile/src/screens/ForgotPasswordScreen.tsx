import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, ForgotPasswordInput } from '../schemas/validation';
import api from '../api/axios';
import { colors, darkColors, tints } from '../theme/tokens';

export default function ForgotPasswordScreen({ navigation }: { navigation: any }) {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useState(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.post('/auth/forgot-password', data);
      setSuccessMsg('If the email exists, a reset code has been sent.');
      setTimeout(() => {
        navigation.navigate('ResetPassword');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: darkColors.background }]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradTop]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradBottom]} />
      </View>

      <Animated.View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a token to reset your password.
          </Text>
        </View>

        {errorMsg && (
          <View style={styles.alertError}>
            <Text style={styles.alertText}>{errorMsg}</Text>
          </View>
        )}

        {successMsg && (
          <View style={styles.alertSuccess}>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>Email Address</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="name@example.com"
                placeholderTextColor={darkColors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.email && <Text style={styles.errorHelper}>{errors.email.message}</Text>}

          <TouchableOpacity style={styles.sendBtn} onPress={handleSubmit(onSubmit)} disabled={isLoading} accessibilityRole="button">
            {isLoading ? (
              <ActivityIndicator color={darkColors.text} />
            ) : (
              <Text style={styles.sendBtnText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')} accessibilityRole="button">
          <Text style={styles.backText}>Back to Log In</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkColors.background },
  gradTop: { top: 0, height: 300, backgroundColor: tints.dangerSubtle },
  gradBottom: { bottom: 0, height: 400, backgroundColor: tints.infoSubtle },
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
  sendBtn: {
    backgroundColor: colors.danger[500], paddingVertical: 16, borderRadius: 14, alignItems: 'center',
    shadowColor: colors.danger[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  sendBtnText: { color: darkColors.text, fontSize: 16, fontWeight: 'bold' },
  backBtn: { alignItems: 'center', marginTop: 28 },
  backText: { color: darkColors.textSecondary, fontSize: 14, fontWeight: '600' },
});