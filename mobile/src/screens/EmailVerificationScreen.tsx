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
import api from '../api/axios';

export default function EmailVerificationScreen({ route, navigation }: { route: any; navigation: any }) {
  const email = route.params?.email || 'your email';
  const [token, setToken] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useState(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  });

  const handleVerify = async () => {
    if (!token.trim()) {
      setErrorMsg('Please enter the verification token.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.post('/auth/verify-email', { token: token.trim() });
      setSuccessMsg('Email verified successfully! You can now log in.');
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Verification failed. Token may be expired.');
    } finally {
      setIsLoading(false);
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
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We sent a verification email to <Text style={styles.emailHighlight}>{email}</Text>. Please copy the verification token from the link or email and paste it below:
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
          <Text style={styles.label}>Verification Token</Text>
          <TextInput
            style={styles.input}
            placeholder="Paste verification token here"
            placeholderTextColor="#6B6B80"
            autoCapitalize="none"
            value={token}
            onChangeText={setToken}
          />

          <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyBtnText}>Verify Email</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Login')}>
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
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  subtitle: { fontSize: 15, color: '#A0A0B8', marginTop: 10, lineHeight: 22 },
  emailHighlight: { color: '#FFFFFF', fontWeight: 'bold' },
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
  verifyBtn: {
    backgroundColor: '#E53935', paddingVertical: 16, borderRadius: 14, alignItems: 'center',
    shadowColor: '#E53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  verifyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  backBtn: { alignItems: 'center', marginTop: 28 },
  backText: { color: '#A0A0B8', fontSize: 14, fontWeight: '600' },
});