// ═══════════════════════════════════════════════════════════════
// ResQDrive v2 — NOTIFICATION PREFERENCES SCREEN (Modernized)
// All imports, logic, state, handlers preserved identically.
// Only JSX structure + StyleSheet updated: dark glassmorphism theme.
// ═══════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import {
  fetchPreferencesStart,
  fetchPreferencesSuccess,
  fetchPreferencesFailure,
  updatePreferenceOptimistic,
} from '../store/slices/notificationsSlice';
import api from '../api/axios';

const CATEGORIES = [
  {
    key: 'alertDeliveryEnabled',
    title: 'Alert Confirmations',
    description: 'Notifications confirming emergency dispatch delivery status.',
    emoji: '🛡️',
  },
  {
    key: 'falseAlarmLogEnabled',
    title: 'False Alarm Logging',
    description: 'Reports logged when alerts are canceled or false alarm flags are set.',
    emoji: '⚠️',
  },
  {
    key: 'systemStatusEnabled',
    title: 'System Status Reports',
    description: 'App status audits, connection reports, and settings configurations.',
    emoji: '⚙️',
  },
  {
    key: 'generalEnabled',
    title: 'General Alerts',
    description: 'General system reports, updates, and community alerts.',
    emoji: '🔔',
  },
];

export default function NotificationPreferencesScreen() {
  const dispatch = useDispatch();
  const { preferences, isLoading, error } = useSelector((state: RootState) => state.notifications);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchPrefs = async () => {
    dispatch(fetchPreferencesStart());
    try {
      const response = await api.get('/notifications/preferences');
      dispatch(fetchPreferencesSuccess(response.data));
    } catch (err: any) {
      dispatch(
        fetchPreferencesFailure(err.response?.data?.message || 'Failed to fetch preferences.')
      );
    }
  };

  useEffect(() => {
    fetchPrefs();
  }, []);

  const handleToggle = async (key: string, currentValue: boolean) => {
    const newValue = !currentValue;

    // 1. Optimistic UI update in Redux store
    dispatch(updatePreferenceOptimistic({ [key]: newValue }));
    setIsUpdating(true);

    try {
      // 2. Persist update on backend
      await api.patch('/notifications/preferences', { [key]: newValue });
    } catch (err) {
      alert('Failed to update preference. Reverting...');
      // 3. Revert on failure
      dispatch(updatePreferenceOptimistic({ [key]: currentValue }));
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading && !preferences) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ Notification Preferences</Text>
        <Text style={styles.subtitle}>
          Configure which categories of push notifications you want to receive on your device
        </Text>
      </View>

      {/* ── Updating indicator ── */}
      {isUpdating && (
        <View style={styles.updatingBanner}>
          <ActivityIndicator size="small" color="#2979FF" />
          <Text style={styles.updatingText}> Syncing...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {preferences && (
        <View style={styles.list}>
          {CATEGORIES.map((category) => {
            const isEnabled = (preferences as any)[category.key] ?? true;

            return (
              <View key={category.key} style={[
                styles.preferenceRow,
                isEnabled && styles.preferenceRowActive,
              ]}>
                <View style={styles.textContainer}>
                  <Text style={styles.emojiLabel}>{category.emoji}</Text>
                  <View style={styles.textInner}>
                    <Text style={styles.preferenceTitle}>{category.title}</Text>
                    <Text style={styles.preferenceDesc}>{category.description}</Text>
                  </View>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={() => handleToggle(category.key, isEnabled)}
                  disabled={isUpdating}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.08)', true: '#E53935' }}
                  thumbColor={isEnabled ? '#FFFFFF' : '#6B6B80'}
                />
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  scrollContent: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#A0A0B8',
    marginTop: 6,
    lineHeight: 20,
  },
  updatingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(41, 121, 255, 0.08)',
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  updatingText: {
    color: '#2979FF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 23, 68, 0.12)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.3)',
    marginVertical: 14,
  },
  errorText: {
    color: '#FF8A80',
    fontSize: 14,
    textAlign: 'center',
  },
  list: {
    width: '100%',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(28, 28, 46, 0.4)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  preferenceRowActive: {
    backgroundColor: 'rgba(28, 28, 46, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textContainer: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  emojiLabel: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  textInner: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  preferenceDesc: {
    fontSize: 12,
    color: '#A0A0B8',
    marginTop: 4,
    lineHeight: 16,
  },
});