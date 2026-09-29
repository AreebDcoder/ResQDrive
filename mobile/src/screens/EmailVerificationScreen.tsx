import React, { useState, useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
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
import { colors, darkColors, tints } from '../theme/tokens';

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
  }, [reduceMotion]);

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
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: darkColors.background }]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradTop]} />
        <View style={[StyleSheet.absoluteFillObject, styles.gradBottom]} />
      </View>

      <Animated.View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-unread-outline" size={36} color={colors.danger[500]} />
          </View>
          <Text style={styles.title} accessibilityRole="header" allowFontScaling={true} maxFontSizeMultiplier={1.5}>Verify Your Email</Text>
          <Text style={styles.subtitle} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
            We've sent a 6-digit verification code to <Text style={styles.emailHighlight} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{email}</Text>.
          </Text>
        </View>

        {errorMsg && (
          <View style={styles.alertError}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger[400]} style={{ marginRight: 8 }} />
            <Text style={styles.alertText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{errorMsg}</Text>
          </View>
        )}

        {successMsg && (
          <View style={styles.alertSuccess}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.success[400]} style={{ marginRight: 8 }} />
            <Text style={styles.successText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>{successMsg}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label} allowFontScaling={true} maxFontSizeMultiplier={1.5}>6-Digit Verification Code</Text>
          <TextInput
            style={styles.otpInput}
            placeholder="• • • • • •"
            placeholderTextColor={darkColors.textTertiary}
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            autoFocus
            allowFontScaling={true}
            maxFontSizeMultiplier={1.5}
          />

          <TouchableOpacity
            style={[styles.verifyBtn, otp.trim().length < 6 && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={isLoading || otp.trim().length < 6} accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color={darkColors.text} />
            ) : (
              <Text style={styles.verifyBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Verify & Continue</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Didn't receive the code? </Text>
            {countdown > 0 ? (
              <Text style={styles.countdownText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Resend in {countdown}s</Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={isResending} accessibilityRole="button">
                {isResending ? (
                  <ActivityIndicator size="small" color={colors.danger[500]} />
                ) : (
                  <Text style={styles.resendBtnText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Resend Code</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')} accessibilityRole="button">
          <Ionicons name="arrow-back-outline" size={16} color={darkColors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.backText} allowFontScaling={true} maxFontSizeMultiplier={1.5}>Back to Log In</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkColors.background },
  gradTop: { top: 0, height: 300, backgroundColor: tints.dangerSubtle },
  gradBottom: { bottom: 0, height: 400, backgroundColor: tints.infoSubtle },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: tints.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: tints.dangerMedium,
  },
  header: { marginBottom: 28 },
  title: { fontSize: 28, fontWeight: 'bold', color: darkColors.text },
  subtitle: { fontSize: 15, color: darkColors.textSecondary, marginTop: 10, lineHeight: 22 },
  emailHighlight: { color: darkColors.text, fontWeight: 'bold' },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tints.dangerErrorBg,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tints.dangerErrorBorder,
    marginBottom: 20,
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tints.successSubtle,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: tints.successMedium,
    marginBottom: 20,
  },
  alertText: { color: colors.danger[300], fontSize: 14, flex: 1 },
  successText: { color: colors.success[500], fontSize: 14, flex: 1 },
  form: { width: '100%' },
  label: { fontSize: 14, color: darkColors.textSecondary, marginBottom: 12, fontWeight: '600' },
  otpInput: {
    backgroundColor: tints.glassCardStrong,
    color: darkColors.text,
    paddingVertical: 18,
    borderRadius: 16,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 12,
    textAlign: 'center',
    marginBottom: 22,
    borderWidth: 1.5,
    borderColor: tints.dangerMedium,
    shadowColor: colors.neutral[950],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  verifyBtn: {
    backgroundColor: colors.danger[500],
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  verifyBtnDisabled: {
    backgroundColor: tints.dangerMedium,
    shadowOpacity: 0,
  },
  verifyBtnText: { color: darkColors.text, fontSize: 16, fontWeight: 'bold' },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  resendText: { color: darkColors.textSecondary, fontSize: 14 },
  countdownText: { color: colors.danger[500], fontSize: 14, fontWeight: '600' },
  resendBtnText: { color: colors.danger[500], fontSize: 14, fontWeight: 'bold', textDecorationLine: 'underline' },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32 },
  backText: { color: darkColors.textSecondary, fontSize: 14, fontWeight: '600' },
});