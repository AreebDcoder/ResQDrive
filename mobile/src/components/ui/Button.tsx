import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing, radius, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { IconName } from './types';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  fullWidth?: boolean;
  accessibilityHint?: string;
  style?: ViewStyle;
}

const VARIANT_COLORS: Record<ButtonVariant, { bg: string; text: string }> = {
  primary: { bg: colors.primary[600], text: '#fff' },
  secondary: { bg: colors.neutral[700], text: '#fff' },
  success: { bg: colors.success[600], text: '#fff' },
  warning: { bg: colors.warning[600], text: '#fff' },
  danger: { bg: colors.danger[600], text: '#fff' },
  ghost: { bg: 'transparent', text: colors.primary[500] },
};

const SIZES: Record<ButtonSize, { paddingV: number; paddingH: number; fontSize: number }> = {
  sm: { paddingV: spacing.sm, paddingH: spacing.md, fontSize: typography.fontSize.sm },
  md: { paddingV: spacing.md + 2, paddingH: spacing.lg, fontSize: typography.fontSize.md },
  lg: { paddingV: spacing.lg, paddingH: spacing.xl, fontSize: typography.fontSize.lg },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  accessibilityHint,
  style,
}: ButtonProps) {
  const vc = VARIANT_COLORS[variant];
  const sz = SIZES[size];
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: vc.bg, opacity: pressed ? 0.85 : 1 },
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={vc.text} size="small" />
      ) : (
        <>
          {icon && <Icon name={icon} size={sz.fontSize + 2} color={vc.text} />}
          <Text style={[styles.text, { color: vc.text, fontSize: sz.fontSize }, icon && styles.textWithIcon]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// Inline icon (avoids importing Ionicons at top — keeps component self-contained)
import { Ionicons } from '@expo/vector-icons';
function Icon({ name, size, color }: { name: IconName; size: number; color: string }) {
  return <Ionicons name={name as any} size={size} color={color} style={styles.icon} />;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    minHeight: 44,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },
  text: { fontWeight: typography.fontWeight.semibold, textAlign: 'center' },
  textWithIcon: { marginLeft: spacing.xs },
  icon: { marginRight: -spacing.xs },
});
