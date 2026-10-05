import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { spacing, radius, shadows } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

type AccentVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'none';

export interface CardProps {
  children: React.ReactNode;
  accent?: AccentVariant;
  padding?: number;
  style?: ViewStyle;
}

import { colors } from '../../theme/tokens';

const ACCENT_COLORS: Record<AccentVariant, string> = {
  primary: colors.primary[500],
  success: colors.success[500],
  warning: colors.warning[500],
  danger: colors.danger[500],
  info: colors.info[500],
  none: 'transparent',
};

export function Card({ children, accent = 'none', padding = spacing.lg, style }: CardProps) {
  const { colors: themeColors } = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
          borderLeftColor: accent !== 'none' ? ACCENT_COLORS[accent] : themeColors.border,
          borderLeftWidth: accent !== 'none' ? 3 : 1,
        },
        style,
      ]}
    >
      <View style={[{ padding }, styles.inner]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  inner: {},
});
