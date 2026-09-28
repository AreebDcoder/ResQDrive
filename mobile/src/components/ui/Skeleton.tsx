import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing, radius } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = radius.sm, style }: SkeletonProps) {
  const { colors: tc } = useTheme();
  return (
    <View
      style={[
        styles.skeleton,
        { width, height, borderRadius, backgroundColor: tc.surfaceElevated },
        style,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel="Loading"
    />
  );
}

const styles = StyleSheet.create({
  skeleton: { overflow: 'hidden' },
});
