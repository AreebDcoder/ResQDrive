import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { typography } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

type TextVariant = 'heading' | 'title' | 'subtitle' | 'body' | 'caption' | 'label' | 'mono';

export interface TextProps {
  children: React.ReactNode;
  variant?: TextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
  style?: any;
}

const VARIANT_STYLES: Record<TextVariant, { fontSize: number; fontWeight: string }> = {
  heading: { fontSize: typography.fontSize['3xl'], fontWeight: typography.fontWeight.bold },
  title: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.semibold },
  subtitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.medium },
  body: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.regular },
  caption: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.regular },
  label: { fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium },
  mono: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.regular },
};

export function Text({ children, variant = 'body', color, align = 'left', numberOfLines, style }: TextProps) {
  const { colors: tc } = useTheme();
  const vs = VARIANT_STYLES[variant];
  return (
    <RNText
      style={[
        { fontSize: vs.fontSize, fontWeight: vs.fontWeight, color: color || tc.text, textAlign: align },
        variant === 'mono' && { fontFamily: 'monospace' },
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {children}
    </RNText>
  );
}
