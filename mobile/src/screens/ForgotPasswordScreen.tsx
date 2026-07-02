import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, ForgotPasswordInput } from '../schemas/validation';
import api from '../api/axios';

export default function ForgotPasswordScreen({ navigation }: { navigation: any }) {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      <View style={styles.header}>
        <Text style={styles.title}>Forgot Password?</Text>
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
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.email && <Text style={styles.errorHelper}>{errors.email.message}</Text>}

        <TouchableOpacity style={styles.sendBtn} onPress={handleSubmit(onSubmit)} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendBtnText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.backText}>Back to Log In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 15,
    color: '#888888',
    marginTop: 10,
    lineHeight: 22,
  },
  alertError: {
    backgroundColor: '#3a1313',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d32f2f',
    marginBottom: 20,
  },
  alertSuccess: {
    backgroundColor: '#133513',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#388e3c',
    marginBottom: 20,
  },
  alertText: {
    color: '#ff8a80',
    fontSize: 14,
    textAlign: 'center',
  },
  successText: {
    color: '#a5d6a7',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1e1e1e',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  inputError: {
    borderColor: '#d32f2f',
    borderWidth: 1,
  },
  errorHelper: {
    color: '#ff8a80',
    fontSize: 12,
    marginTop: -10,
    marginBottom: 16,
  },
  sendBtn: {
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backBtn: {
    alignItems: 'center',
    marginTop: 28,
  },
  backText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
  },
});
