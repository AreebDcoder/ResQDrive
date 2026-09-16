import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import api from '../api/axios';

interface HealthStatus {
  devMode: boolean;
  channels: {
    push: { configured: boolean; label: string };
    sms: { configured: boolean; label: string };
    email: { configured: boolean; label: string };
  };
}

export default function DevModeBanner() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    api.get('/alert-dispatch/health')
      .then((res) => { if (mounted) setHealth(res.data); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  if (!health || !health.devMode) return null;

  const unconfigured = Object.entries(health.channels)
    .filter(([_, v]) => !v.configured)
    .map(([k, v]) => v.label);

  return (
    <View style={styles.banner}>
      <Text style={styles.title}>⚠️ DEV MODE</Text>
      <Text style={styles.text}>
        Not configured: {unconfigured.join(', ')}
      </Text>
      <Text style={styles.hint}>
        Emergency alerts will fall back to your phone's SMS app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(255, 183, 77, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 77, 0.4)',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    color: '#FFB74D',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  text: {
    color: '#FFD180',
    fontSize: 11,
    marginBottom: 2,
  },
  hint: {
    color: 'rgba(255, 209, 128, 0.7)',
    fontSize: 10,
  },
});