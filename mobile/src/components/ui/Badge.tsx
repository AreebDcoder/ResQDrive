import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../../theme/tokens';
import type { IconName } from './types';
import { Ionicons } from '@expo/vector-icons';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: IconName;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  primary: { bg: colors.primary[100], text: colors.primary[700], dot: colors.primary[500] },
  success: { bg: colors.success[100], text: colors.success[700], dot: colors.success[500] },
  warning: { bg: colors.warning[100], text: colors.warning[700], dot: colors.warning[500] },
  danger: { bg: colors.danger[100], text: colors.danger[700], dot: colors.danger[500] },
  info: { bg: colors.info[100], text: colors.info[700], dot: colors.info[500] },
  neutral: { bg: colors.neutral[200], text: colors.neutral[600], dot: colors.neutral[400] },
};

const SIZES: Record<BadgeSize, { paddingV: number; paddingH: number; fontSize: number }> = {
  sm: { paddingV: 2, paddingH: spacing.sm, fontSize: typography.fontSize.xs },
  md: { paddingV: spacing.xs, paddingH: spacing.sm + 2, fontSize: typography.fontSize.sm },
};

export function Badge({ label, variant = 'neutral', size = 'md', dot = false, icon }: BadgeProps) {
  const vs = VARIANT_STYLES[variant];
  const sz = SIZES[size];
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: vs.bg, paddingVertical: sz.paddingV, paddingHorizontal: sz.paddingH },
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: vs.dot }]} />}
      {icon && <Ionicons name={icon as any} size={sz.fontSize + 2} color={vs.text} style={styles.icon} />}
      <Text style={[styles.text, { color: vs.text, fontSize: sz.fontSize }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.full },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: spacing.xs },
  icon: { marginRight: spacing.xs },
  text: { fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
});
