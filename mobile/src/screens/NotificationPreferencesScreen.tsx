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
    key: 'drivingModeEnabled',
    title: 'Driving Mode Indicators',
    description: 'Alert when sensor monitoring pairs or terminates in driving mode.',
  },
  {
    key: 'alertDeliveryEnabled',
    title: 'Alert Confirmations',
    description: 'Notifications confirming emergency dispatch delivery status.',
  },
  {
    key: 'falseAlarmLogEnabled',
    title: 'False Alarm Logging',
    description: 'Reports logged when alerts are canceled or false alarm flags are set.',
  },
  {
    key: 'systemStatusEnabled',
    title: 'System Status Reports',
    description: 'App status audits, connection reports, and settings configurations.',
  },
  {
    key: 'generalEnabled',
    title: 'General Alerts',
    description: 'General system reports, updates, and community alerts.',
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
        <ActivityIndicator size="large" color="#d32f2f" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Notification Preferences</Text>
        <Text style={styles.subtitle}>
          Configure which categories of push notifications you want to receive on your device
        </Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {preferences && (
        <View style={styles.list}>
          {CATEGORIES.map((category) => {
            const isEnabled = (preferences as any)[category.key] ?? true;

            return (
              <View key={category.key} style={styles.preferenceRow}>
                <View style={styles.textContainer}>
                  <Text style={styles.preferenceTitle}>{category.title}</Text>
                  <Text style={styles.preferenceDesc}>{category.description}</Text>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={() => handleToggle(category.key, isEnabled)}
                  disabled={isUpdating}
                  trackColor={{ false: '#3e3e3e', true: '#d32f2f' }}
                  thumbColor={isEnabled ? '#ffffff' : '#f4f3f4'}
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
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 24,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    marginTop: 6,
    lineHeight: 20,
  },
  errorText: {
    color: '#ff5252',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 14,
  },
  list: {
    width: '100%',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  textContainer: {
    flex: 0.8,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  preferenceDesc: {
    fontSize: 12,
    color: '#888888',
    marginTop: 4,
    lineHeight: 16,
  },
});
