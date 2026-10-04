import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Ionicons } from '@expo/vector-icons';
import type { IconName } from './types';
import { Text } from './Text';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'list', title, description, actionLabel, onAction }: EmptyStateProps) {
  const { colors: tc } = useTheme();
  return (
    <View style={styles.container} accessibilityRole="text">
      <Ionicons name={icon as any} size={48} color={tc.textTertiary} />
      <Text style={[styles.title, { color: tc.text }]}>{title}</Text>
      {description && <Text style={[styles.description, { color: tc.textSecondary }]}>{description}</Text>}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['3xl'], paddingHorizontal: spacing.xl },
  title: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, marginTop: spacing.md, textAlign: 'center' },
  description: { fontSize: typography.fontSize.sm, marginTop: spacing.xs, textAlign: 'center', lineHeight: typography.lineHeight.relaxed },
  action: { marginTop: spacing.lg },
});
