import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', description, onRetry }: ErrorStateProps) {
  const { colors: tc } = useTheme();
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={40} color={colors.danger[500]} />
      <Text style={[styles.title, { color: tc.text }]}>{title}</Text>
      {description && <Text style={[styles.description, { color: tc.textSecondary }]}>{description}</Text>}
      {onRetry && <Button label="Try again" onPress={onRetry} variant="secondary" size="sm" style={styles.retry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['3xl'], paddingHorizontal: spacing.xl },
  title: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginTop: spacing.md, textAlign: 'center' },
  description: { fontSize: typography.fontSize.sm, marginTop: spacing.xs, textAlign: 'center', lineHeight: typography.lineHeight.relaxed },
  retry: { marginTop: spacing.lg },
});
