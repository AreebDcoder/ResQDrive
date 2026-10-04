import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { spacing, radius, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Ionicons } from '@expo/vector-icons';
import type { IconName } from './types';
import { Text } from './Text';
import { Badge } from './Badge';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  badge?: string;
  badgeVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  onPress?: () => void;
  trailing?: React.ReactNode;
}

export function ListItem({
  title, subtitle, leftIcon, rightIcon, badge, badgeVariant = 'neutral',
  onPress, trailing,
}: ListItemProps) {
  const { colors: tc } = useTheme();
  const content = (
    <View style={[styles.container, { backgroundColor: tc.surface, borderBottomColor: tc.border }]}>
      {leftIcon && (
        <View style={[styles.leftIcon, { backgroundColor: tc.surfaceElevated }]}>
          <Ionicons name={leftIcon as any} size={20} color={tc.text} />
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text variant="subtitle" style={styles.title}>{title}</Text>
          {badge && <Badge label={badge} variant={badgeVariant} size="sm" />}
        </View>
        {subtitle && <Text variant="caption" color={tc.textSecondary} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {trailing || (rightIcon && <Ionicons name={rightIcon as any} size={18} color={tc.textTertiary} />)}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 1, minHeight: 56 },
  leftIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1 },
  pressed: { opacity: 0.6 },
});
