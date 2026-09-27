import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/axios';

export default function EmailVerificationScreen({ route, navigation }: { route: any; navigation: any }) {
  const email = route.params?.email || 'your email';
  const [otp, setOtp] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleVerify = async () => {
    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.post('/auth/verify-email', { token: cleanOtp });
      setSuccessMsg('Email verified successfully! You can now log in.');
      setTimeout(() => {
        navigation.navigate('Login');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Verification failed. Code may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.post('/auth/resend-verification', { email });
      setSuccessMsg(res.data?.message || 'A fresh 6-digit verification code has been sent to your email.');
      setCountdown(60);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0A0A0F' }]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradTop]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradBottom]} />
      </View>

      <Animated.View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-unread-outline" size={36} color="#E53935" />
          </View>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit verification code to <Text style={styles.emailHighlight}>{email}</Text>.
          </Text>
        </View>

        {errorMsg && (
          <View style={styles.alertError}>
            <Ionicons name="alert-circle-outline" size={18} color="#FF5252" style={{ marginRight: 8 }} />
            <Text style={styles.alertText}>{errorMsg}</Text>
          </View>
        )}

        {successMsg && (
          <View style={styles.alertSuccess}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#00E676" style={{ marginRight: 8 }} />
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>6-Digit Verification Code</Text>
          <TextInput
            style={styles.otpInput}
            placeholder="• • • • • •"
            placeholderTextColor="#4B4B60"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.verifyBtn, otp.trim().length < 6 && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={isLoading || otp.trim().length < 6}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyBtnText}>Verify & Continue</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            {countdown > 0 ? (
              <Text style={styles.countdownText}>Resend in {countdown}s</Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={isResending}>
                {isResending ? (
                  <ActivityIndicator size="small" color="#E53935" />
                ) : (
                  <Text style={styles.resendBtnText}>Resend Code</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')}>
          <Ionicons name="arrow-back-outline" size={16} color="#A0A0B8" style={{ marginRight: 6 }} />
          <Text style={styles.backText}>Back to Log In</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  gradTop: { top: 0, height: 300, backgroundColor: 'rgba(229, 57, 53, 0.08)' },
  gradBottom: { bottom: 0, height: 400, backgroundColor: 'rgba(41, 121, 255, 0.06)' },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(229, 57, 53, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.25)',
  },
  header: { marginBottom: 28 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  subtitle: { fontSize: 15, color: '#A0A0B8', marginTop: 10, lineHeight: 22 },
  emailHighlight: { color: '#FFFFFF', fontWeight: 'bold' },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 23, 68, 0.12)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.3)',
    marginBottom: 20,
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    marginBottom: 20,
  },
  alertText: { color: '#FF8A80', fontSize: 14, flex: 1 },
  successText: { color: '#00E676', fontSize: 14, flex: 1 },
  form: { width: '100%' },
  label: { fontSize: 14, color: '#A0A0B8', marginBottom: 12, fontWeight: '600' },
  otpInput: {
    backgroundColor: 'rgba(28, 28, 46, 0.7)',
    color: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 16,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 12,
    textAlign: 'center',
    marginBottom: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(229, 57, 53, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  verifyBtn: {
    backgroundColor: '#E53935',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  verifyBtnDisabled: {
    backgroundColor: 'rgba(229, 57, 53, 0.4)',
    shadowOpacity: 0,
  },
  verifyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  resendText: { color: '#8E8EA8', fontSize: 14 },
  countdownText: { color: '#E53935', fontSize: 14, fontWeight: '600' },
  resendBtnText: { color: '#E53935', fontSize: 14, fontWeight: 'bold', textDecorationLine: 'underline' },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  backText: { color: '#A0A0B8', fontSize: 14, fontWeight: '600' },
});