import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { spacing, radius, typography, shadows } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Ionicons } from '@expo/vector-icons';
import type { IconName } from './types';
import { Text } from './Text';

export interface HeaderProps {
  title: string;
  onBack?: () => void;
  rightIcon?: IconName;
  onRightPress?: () => void;
  rightLabel?: string;
}

export function Header({ title, onBack, rightIcon, onRightPress, rightLabel }: HeaderProps) {
  const { colors: tc } = useTheme();
  return (
    <View style={[styles.container, { borderBottomColor: tc.border, backgroundColor: tc.surface }]}>
      {onBack && (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={tc.text} />
        </Pressable>
      )}
      <Text variant="title" style={styles.title}>{title}</Text>
      {rightIcon && onRightPress && (
        <Pressable
          onPress={onRightPress}
          accessibilityRole="button"
          accessibilityLabel={rightLabel || 'Action'}
          style={styles.rightButton}
        >
          <Ionicons name={rightIcon as any} size={22} color={tc.text} />
        </Pressable>
      )}
      {rightLabel && onRightPress && !rightIcon && (
        <Pressable onPress={onRightPress} accessibilityRole="button" accessibilityLabel={rightLabel} style={styles.rightButton}>
          <Text variant="label" color="#6366f1">{rightLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  backButton: { paddingRight: spacing.md, minHeight: 44, minWidth: 44, justifyContent: 'center' },
  title: { flex: 1 },
  rightButton: { paddingLeft: spacing.md, minHeight: 44, minWidth: 44, justifyContent: 'center' },
});
