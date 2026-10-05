/**
 * OfflineBanner — shows a banner when the device has no internet.
 *
 * Uses the existing subscribeToConnectivityChanges utility from
 * emergencyFallback.ts (which was defined but never consumed).
 *
 * The banner appears at the top of the screen as a thin red strip:
 *   "⚠ You're offline — SMS fallback active"
 *
 * It disappears automatically when connectivity is restored.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, darkColors, spacing, typography } from '../theme/tokens';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Import dynamically to avoid circular dependency with emergencyFallback
    const { subscribeToConnectivityChanges } = require('../utils/emergencyFallback');
    const unsubscribe = subscribeToConnectivityChanges((isConnected: boolean) => {
      setIsOffline(!isConnected);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={16} color={darkColors.text} />
      <Text style={styles.text} allowFontScaling={true} maxFontSizeMultiplier={1.5}>
        You're offline — SMS fallback active
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.danger[600],
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  text: {
    color: darkColors.text,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
});
