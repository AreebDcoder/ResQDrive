import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from './Modal';
import { Button } from './Button';
import { Text } from './Text';

type ConfirmVariant = 'danger' | 'warning' | 'primary';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const VARIANT_ICON: Record<ConfirmVariant, { icon: string; color: string }> = {
  danger: { icon: 'trash', color: colors.danger[500] },
  warning: { icon: 'warning', color: colors.warning[500] },
  primary: { icon: 'information-circle', color: colors.primary[500] },
};

export function ConfirmDialog({
  visible, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'primary', onConfirm, onCancel, loading = false,
}: ConfirmDialogProps) {
  const { colors: tc } = useTheme();
  const vc = VARIANT_ICON[variant];

  return (
    <Modal visible={visible} onClose={onCancel} title={title} dismissable={!loading}>
      <View style={styles.content}>
        <View style={styles.iconRow}>
          <View style={[styles.iconCircle, { backgroundColor: `${vc.color}20` }]}>
            <Ionicons name={vc.icon as any} size={28} color={vc.color} />
          </View>
        </View>
        {description && (
          <Text variant="body" color={tc.textSecondary} style={styles.description}>
            {description}
          </Text>
        )}
        <View style={styles.buttons}>
          <Button label={cancelLabel} onPress={onCancel} variant="secondary" size="md" disabled={loading} style={{ flex: 1 }} />
          <Button
            label={confirmLabel}
            onPress={onConfirm}
            variant={variant === 'primary' ? 'primary' : variant}
            size="md"
            loading={loading}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  iconRow: { alignItems: 'center', paddingVertical: spacing.sm },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  description: { textAlign: 'center', lineHeight: typography.lineHeight.relaxed, paddingHorizontal: spacing.sm },
  buttons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});
