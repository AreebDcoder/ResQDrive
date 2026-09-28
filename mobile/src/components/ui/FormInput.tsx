import React from 'react';
import { Controller, type Control, type FieldValues, type FieldPath } from 'react-hook-form';
import { Input } from './Input';
import type { IconName } from './types';

export interface FormInputProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  placeholder?: string;
  leftIcon?: IconName;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  rules?: any;
  multiline?: boolean;
  numberOfLines?: number;
  editable?: boolean;
  hint?: string;
  accessibilityLabel?: string;
}

/**
 * FormInput — react-hook-form Controller wrapper around the Input primitive.
 *
 * Usage:
 *   <FormInput name="email" control={control} label="Email" placeholder="you@example.com" leftIcon="mail" keyboardType="email-address" />
 *
 * Zod validation errors automatically display via the Input's error prop.
 */
export function FormInput<T extends FieldValues>({
  name, control, label, placeholder, leftIcon, secureTextEntry,
  keyboardType = 'default', autoCapitalize = 'none', rules, multiline,
  numberOfLines, editable, hint, accessibilityLabel,
}: FormInputProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <Input
          label={label}
          value={value || ''}
          onChangeText={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          error={error?.message}
          hint={hint}
          leftIcon={leftIcon}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          accessibilityLabel={accessibilityLabel || label}
        />
      )}
    />
  );
}
