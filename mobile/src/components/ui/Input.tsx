import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { spacing, radius, typography, colors } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Ionicons } from '@expo/vector-icons';
import type { IconName } from './types';

export interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  leftIcon?: IconName;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function Input({
  label, value, onChangeText, placeholder, error, hint, leftIcon,
  secureTextEntry, keyboardType = 'default', autoCapitalize = 'none',
  editable = true, multiline = false, numberOfLines = 1,
  accessibilityLabel, style,
}: InputProps) {
  const { colors: tc } = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputId = label ? label.toLowerCase().replace(/\s+/g, '-') : undefined;

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text
          style={[styles.label, { color: tc.textSecondary }]}
          nativeID={inputId ? `${inputId}-label` : undefined}
        >
          {label}
        </Text>
      )}
      <View style={[
        styles.inputContainer,
        {
          backgroundColor: tc.surface,
          borderColor: error ? colors.danger[500] : focused ? colors.primary[500] : tc.border,
        },
        !editable && styles.disabled,
        style,
      ]}>
        {leftIcon && (
          <Ionicons name={leftIcon as any} size={18} color={tc.textTertiary} style={styles.leftIcon} />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tc.textTertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          style={[styles.input, { color: tc.text }, leftIcon && styles.inputWithIcon]}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityState={{ disabled: !editable }}
        />
        {secureTextEntry && (
          <PressableIcon
            name={showPassword ? 'eye-off' : 'eye'}
            size={18}
            color={tc.textTertiary}
            onPress={() => setShowPassword(!showPassword)}
            label={showPassword ? 'Hide password' : 'Show password'}
          />
        )}
      </View>
      {hint && !error && <Text style={[styles.hint, { color: tc.textTertiary }]}>{hint}</Text>}
      {error && <Text style={[styles.error, { color: colors.danger[500] }]} accessibilityRole="alert">{error}</Text>}
    </View>
  );
}

import { Pressable } from 'react-native';

function PressableIcon({ name, size, color, onPress, label }: { name: string; size: number; color: string; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.rightIcon}>
      <Ionicons name={name as any} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  label: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, marginBottom: spacing.sm },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, fontSize: typography.fontSize.md, minHeight: 48, paddingVertical: spacing.sm },
  inputWithIcon: { marginLeft: spacing.sm },
  leftIcon: { marginRight: 0 },
  rightIcon: { padding: spacing.xs },
  disabled: { opacity: 0.6 },
  hint: { fontSize: typography.fontSize.xs, marginTop: spacing.xs },
  error: { fontSize: typography.fontSize.xs, marginTop: spacing.xs },
});
