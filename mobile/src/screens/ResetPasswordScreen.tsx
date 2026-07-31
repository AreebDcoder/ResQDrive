import React, { useState, useRef } from 'react';
import {
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

export default function ResetPasswordScreen({ navigation }: { navigation: any }) {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0A0A0F' }]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradTop]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradBottom]} />
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Enter the reset token sent to your email and your new password</Text>
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
            <Text style={styles.label}>Reset Token</Text>
            <Controller
              control={control}
              name="token"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={[styles.input, errors.token && styles.inputError]}
                  placeholder="Enter reset token"
                  placeholderTextColor="#6B6B80"
                  autoCapitalize="none"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            {errors.token && <Text style={styles.errorHelper}>{errors.token.message}</Text>}

            <Text style={styles.label}>New Password</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="At least 8 characters, 1 number, 1 special char"
                    placeholderTextColor="#6B6B80"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                    <Text style={styles.eyeBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.password && <Text style={styles.errorHelper}>{errors.password.message}</Text>}

            <Text style={styles.label}>Confirm New Password</Text>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={[styles.passwordContainer, errors.confirmPassword && styles.inputError]}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm your new password"
                    placeholderTextColor="#6B6B80"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Text style={styles.eyeBtnText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.confirmPassword && <Text style={styles.errorHelper}>{errors.confirmPassword.message}</Text>}

            <TouchableOpacity style={styles.resetBtn} onPress={handleSubmit(onSubmit)} disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.resetBtnText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.backText}>Back to Log In</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  gradTop: { top: 0, height: 300, backgroundColor: 'rgba(229, 57, 53, 0.08)' },
  gradBottom: { bottom: 0, height: 400, backgroundColor: 'rgba(41, 121, 255, 0.06)' },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', paddingBottom: 40 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  subtitle: { fontSize: 15, color: '#A0A0B8', marginTop: 10, lineHeight: 22 },
  alertError: {
    backgroundColor: 'rgba(255, 23, 68, 0.12)', padding: 12, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255, 23, 68, 0.3)', marginBottom: 20,
  },
  alertSuccess: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)', padding: 12, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(0, 230, 118, 0.3)', marginBottom: 20,
  },
  alertText: { color: '#FF8A80', fontSize: 14, textAlign: 'center' },
  successText: { color: '#00E676', fontSize: 14, textAlign: 'center' },
  form: { width: '100%' },
  label: { fontSize: 14, color: '#A0A0B8', marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)', color: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  inputError: { borderColor: 'rgba(255, 23, 68, 0.5)' },
  errorHelper: { color: '#FF8A80', fontSize: 12, marginTop: -10, marginBottom: 16 },
  resetBtn: {
    backgroundColor: '#E53935', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 10,
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  resetBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  backBtn: { alignItems: 'center', marginTop: 28 },
  backText: { color: '#A0A0B8', fontSize: 14, fontWeight: '600' },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)', paddingRight: 16,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  passwordInput: { flex: 1, color: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  eyeBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  eyeBtnText: { color: '#E53935', fontSize: 13, fontWeight: 'bold' },
});