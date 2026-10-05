import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { spacing, radius, typography, colors } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export interface TextareaProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  numberOfLines?: number;
  maxLength?: number;
  editable?: boolean;
  accessibilityLabel?: string;
}

/**
 * Textarea — multiline text input with label, error, hint, character count.
 *
 * Usage:
 *   <Textarea label="Description" value={text} onChangeText={setText} placeholder="Describe..." numberOfLines={4} maxLength={500} />
 */
export function Textarea({
  label, value, onChangeText, placeholder, error, hint,
  numberOfLines = 4, maxLength, editable = true, accessibilityLabel,
}: TextareaProps) {
  const { colors: tc } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: tc.textSecondary }]}>{label}</Text>
      )}
      <View style={[
        styles.container,
        {
          backgroundColor: tc.surface,
          borderColor: error ? colors.danger[500] : focused ? colors.primary[500] : tc.border,
        },
        !editable && styles.disabled,
      ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tc.textTertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={editable}
          style={[styles.input, { color: tc.text }]}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityState={{ disabled: !editable }}
          textAlignVertical="top"
        />
      </View>
      <View style={styles.footer}>
        {hint && !error && <Text style={[styles.hint, { color: tc.textTertiary }]}>{hint}</Text>}
        {error && <Text style={[styles.error, { color: colors.danger[500] }]} accessibilityRole="alert">{error}</Text>}
        {maxLength && (
          <Text style={[styles.count, { color: tc.textTertiary }]}>
            {value.length}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  label: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, marginBottom: spacing.sm },
  container: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 48 },
  input: { fontSize: typography.fontSize.md, paddingVertical: spacing.sm },
  disabled: { opacity: 0.6 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs, minHeight: 16 },
  hint: { fontSize: typography.fontSize.xs, flex: 1 },
  error: { fontSize: typography.fontSize.xs, flex: 1 },
  count: { fontSize: typography.fontSize.xs },
});
