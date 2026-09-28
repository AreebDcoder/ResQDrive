import React from 'react';
import { Controller, type Control, type FieldValues, type FieldPath } from 'react-hook-form';
import { Select } from './Select';

export interface FormSelectProps<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  options: Array<{ label: string; value: string }>;
  placeholder?: string;
  rules?: any;
  accessibilityLabel?: string;
}

/**
 * FormSelect — react-hook-form Controller wrapper around the Select primitive.
 *
 * Usage:
 *   <FormSelect name="role" control={control} label="Role" options={[...]} />
 */
export function FormSelect<T extends FieldValues>({
  name, control, label, options, placeholder, rules, accessibilityLabel,
}: FormSelectProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <Select
          label={label}
          value={value || ''}
          options={options}
          onChange={onChange}
          placeholder={placeholder}
          error={error?.message}
          accessibilityLabel={accessibilityLabel || label}
        />
      )}
    />
  );
}
