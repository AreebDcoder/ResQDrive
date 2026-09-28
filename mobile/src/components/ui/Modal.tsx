import React, { useEffect, useRef } from 'react';
import { View, Pressable, Modal as RNModal, StyleSheet, BackHandler } from 'react-native';
import { colors, spacing, radius } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Ionicons } from '@expo/vector-icons';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  dismissable?: boolean;
}

export function Modal({ visible, onClose, title, children, dismissable = true }: ModalProps) {
  const { colors: tc } = useTheme();

  // Android back button closes modal
  useEffect(() => {
    if (!visible || !dismissable) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => handler.remove();
  }, [visible, dismissable, onClose]);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={dismissable ? onClose : undefined}
      accessibilityRole="alert"
    >
      <Pressable style={styles.backdrop} onPress={dismissable ? onClose : undefined}>
        <Pressable style={[styles.modal, { backgroundColor: tc.surface, borderColor: tc.border }]} onPress={(e) => e.stopPropagation()}>
          {title && (
            <View style={[styles.header, { borderBottomColor: tc.border }]}>
              <View style={{ flex: 1 }}>
                <View>
                  <Text style={[styles.title, { color: tc.text }]}>{title}</Text>
                </View>
              </View>
              {dismissable && (
                <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={tc.textSecondary} />
                </Pressable>
              )}
            </View>
          )}
          <View style={styles.body}>{children}</View>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

import { Text } from './Text';

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modal: { width: '100%', maxWidth: 400, borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, minHeight: 56 },
  title: { fontSize: 16, fontWeight: '600' },
  closeBtn: { padding: spacing.xs, minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
  body: { padding: spacing.lg },
});
