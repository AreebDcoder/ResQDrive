import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Ionicons } from '@expo/vector-icons';
import type { IconName } from './types';
import { Text } from './Text';

export interface SelectProps {
  label?: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  accessibilityLabel?: string;
}

export function Select({ label, value, options, onChange, placeholder = 'Select...', error, accessibilityLabel }: SelectProps) {
  const { colors: tc } = useTheme();
  const [open, setOpen] = React.useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <View style={styles.wrapper}>
      {label && <Text variant="label" color={tc.textSecondary} style={styles.label}>{label}</Text>}
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || label}
        accessibilityHint="Opens dropdown"
        style={[
          styles.selectContainer,
          { backgroundColor: tc.surface, borderColor: error ? colors.danger[500] : tc.border },
        ]}
      >
        <Text style={[styles.value, { color: selected ? tc.text : tc.textTertiary }]}>
          {selected?.label || placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={tc.textTertiary} />
      </Pressable>

      {open && (
        <View style={[styles.dropdown, { backgroundColor: tc.surface, borderColor: tc.border }]}>
          {options.map(opt => (
            <Pressable
              key={opt.value}
              onPress={() => { onChange(opt.value); setOpen(false); }}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              accessibilityState={{ selected: opt.value === value }}
              style={({ pressed }) => [styles.option, pressed && { backgroundColor: tc.surfaceElevated }]}
            >
              <Text style={[styles.optionText, { color: opt.value === value ? colors.primary[600] : tc.text }]}>
                {opt.label}
              </Text>
              {opt.value === value && <Ionicons name="checkmark" size={16} color={colors.primary[600]} />}
            </Pressable>
          ))}
        </View>
      )}
      {error && <Text style={[styles.error, { color: colors.danger[500] }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  label: { marginBottom: spacing.sm },
  selectContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: radius.md, minHeight: 48, paddingHorizontal: spacing.md },
  value: { fontSize: typography.fontSize.md },
  dropdown: { borderWidth: 1, borderRadius: radius.md, marginTop: spacing.xs, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, minHeight: 44 },
  optionText: { fontSize: typography.fontSize.md, flex: 1 },
  error: { fontSize: typography.fontSize.xs, marginTop: spacing.xs },
});
