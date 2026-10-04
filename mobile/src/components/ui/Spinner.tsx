import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Text } from './Text';

export interface SpinnerProps {
  label?: string;
  size?: 'small' | 'large';
}

export function Spinner({ label, size = 'small' }: SpinnerProps) {
  const { colors: tc } = useTheme();
  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <ActivityIndicator size={size} color={colors.primary[500]} />
      {label && <Text style={[styles.label, { color: tc.textTertiary }]}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  label: { fontSize: typography.fontSize.sm, marginTop: spacing.sm },
});
