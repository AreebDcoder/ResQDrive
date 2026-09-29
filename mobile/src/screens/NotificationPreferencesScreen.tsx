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
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../components/ui/Toast';
import { colors, darkColors, tints } from '../theme/tokens';

const CATEGORIES: Array<{
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    key: 'alertDeliveryEnabled',
    title: 'Alert Confirmations',
    description: 'Notifications confirming emergency dispatch delivery status.',
    icon: 'shield-checkmark-outline',
  },
  {
    key: 'falseAlarmLogEnabled',
    title: 'False Alarm Logging',
    description: 'Reports logged when alerts are canceled or false alarm flags are set.',
    icon: 'alert-circle-outline',
  },
  {
    key: 'systemStatusEnabled',
    title: 'System Status Reports',
    description: 'App status audits, connection reports, and settings configurations.',
    icon: 'settings-outline',
  },
  {
    key: 'generalEnabled',
    title: 'General Alerts',
    description: 'General system reports, updates, and community alerts.',
    icon: 'notifications-outline',
  },
];

export default function NotificationPreferencesScreen() {
  const toast = useToast();
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
      toast.error('Failed to update preference. Reverting...');
      // 3. Revert on failure
      dispatch(updatePreferenceOptimistic({ [key]: currentValue }));
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading && !preferences) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.danger[500]} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="settings-outline" size={26} color={colors.danger[500]} />
          <Text style={styles.title} accessibilityRole="header">Notification Preferences</Text>
        </View>
        <Text style={styles.subtitle}>
          Configure which categories of push notifications you want to receive on your device
        </Text>
      </View>

      {/* ── Updating indicator ── */}
      {isUpdating && (
        <View style={styles.updatingBanner}>
          <ActivityIndicator size="small" color={colors.info[500]} />
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
                  <Ionicons name={category.icon} size={22} color={colors.danger[500]} style={{ marginRight: 12 }} />
                  <View style={styles.textInner}>
                    <Text style={styles.preferenceTitle}>{category.title}</Text>
                    <Text style={styles.preferenceDesc}>{category.description}</Text>
                  </View>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={() => handleToggle(category.key, isEnabled)}
                  disabled={isUpdating}
                  trackColor={{ false: tints.whiteBorderStrong, true: colors.danger[500] }}
                  thumbColor={isEnabled ? darkColors.text : darkColors.textTertiary}
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
    backgroundColor: darkColors.background,
  },
  scrollContent: {
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: darkColors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: darkColors.text,
  },
  subtitle: {
    fontSize: 14,
    color: darkColors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  updatingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tints.infoSubtle,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  updatingText: {
    color: colors.info[500],
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  errorBanner: {
    backgroundColor: tints.dangerErrorBg,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: tints.dangerErrorBorder,
    marginVertical: 14,
  },
  errorText: {
    color: colors.danger[300],
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
    backgroundColor: tints.glassCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: tints.whiteBorder,
  },
  preferenceRowActive: {
    backgroundColor: tints.glassCard,
    borderColor: tints.whiteBorderStrong,
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
    color: darkColors.text,
  },
  preferenceDesc: {
    fontSize: 12,
    color: darkColors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
});