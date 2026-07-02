import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../api/axios';

export default function EmailVerificationScreen({ route, navigation }: { route: any; navigation: any }) {
  const email = route.params?.email || 'your email';
  const [token, setToken] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
          placeholderTextColor="#666"
          autoCapitalize="none"
          value={token}
          onChangeText={setToken}
        />

        <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.verifyBtnText}>Verify Email</Text>
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
  emailHighlight: {
    color: '#ffffff',
    fontWeight: 'bold',
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
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  verifyBtn: {
    backgroundColor: '#d32f2f',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyBtnText: {
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
