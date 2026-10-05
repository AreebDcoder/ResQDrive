import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Ionicons } from '@expo/vector-icons';
import type { IconName } from './types';

export interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
}

export function FilterChip({ label, selected, onPress, icon }: FilterChipProps) {
  const { colors: tc } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={[
        styles.container,
        {
          backgroundColor: selected ? colors.primary[600] : tc.surface,
          borderColor: selected ? colors.primary[600] : tc.border,
        },
      ]}
    >
      {icon && <Ionicons name={icon as any} size={14} color={selected ? '#fff' : tc.textSecondary} style={styles.icon} />}
      <Text style={[styles.text, { color: selected ? '#fff' : tc.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: 1, minHeight: 36 },
  icon: { marginRight: spacing.xs },
  text: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium },
});
