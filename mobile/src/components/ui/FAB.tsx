import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing, radius, shadows } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Ionicons } from '@expo/vector-icons';
import type { IconName } from './types';

export interface FABProps {
  icon: IconName;
  onPress: () => void;
  label?: string;
  variant?: 'primary' | 'success' | 'danger';
  style?: ViewStyle;
}

const VARIANT_BG: Record<string, string> = {
  primary: colors.primary[600],
  success: colors.success[600],
  danger: colors.danger[600],
};

export function FAB({ icon, onPress, label, variant = 'primary', style }: FABProps) {
  const { colors: tc } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label || 'FAB'}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: VARIANT_BG[variant] || colors.primary[600], opacity: pressed ? 0.85 : 1 },
        label && styles.extended,
        style,
      ]}
    >
      <Ionicons name={icon as any} size={24} color="#fff" />
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

import { Text } from './Text';

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  extended: { width: 'auto', paddingHorizontal: spacing.lg, flexDirection: 'row', gap: spacing.sm },
  label: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
