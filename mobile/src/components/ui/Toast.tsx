import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { colors, spacing, radius, typography, shadows, animations } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Ionicons } from '@expo/vector-icons';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const VARIANT_CONFIG: Record<ToastVariant, { bg: string; icon: string; iconColor: string }> = {
  success: { bg: colors.success[600], icon: 'checkmark-circle', iconColor: '#fff' },
  error: { bg: colors.danger[600], icon: 'close-circle', iconColor: '#fff' },
  warning: { bg: colors.warning[600], icon: 'warning', iconColor: '#fff' },
  info: { bg: colors.info[600], icon: 'information-circle', iconColor: '#fff' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: animations.fast, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -100, duration: animations.normal, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [fadeAnim, slideAnim]);

  const show = useCallback((message: string, variant: ToastVariant = 'info', duration = 3000) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const id = Date.now().toString();
    setToast({ id, message, variant, duration });
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: animations.fast, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: animations.normal, useNativeDriver: true }),
    ]).start();

    timeoutRef.current = setTimeout(dismiss, duration);
  }, [fadeAnim, slideAnim, dismiss]);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const ctx: ToastContextValue = {
    show,
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    warning: (msg) => show(msg, 'warning'),
    info: (msg) => show(msg, 'info'),
  };

  const vc = toast ? VARIANT_CONFIG[toast.variant] : VARIANT_CONFIG.info;

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            { backgroundColor: vc.bg, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Ionicons name={vc.icon as any} size={20} color={vc.iconColor} style={styles.icon} />
          <Text style={styles.message} numberOfLines={3}>{toast.message}</Text>
          <Pressable onPress={dismiss} accessibilityRole="button" accessibilityLabel="Dismiss" style={styles.closeBtn}>
            <Ionicons name="close" size={16} color={vc.iconColor} />
          </Pressable>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    ...shadows.lg,
    zIndex: 9999,
  },
  icon: { marginRight: spacing.sm },
  message: { flex: 1, color: '#fff', fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium },
  closeBtn: { paddingLeft: spacing.sm },
});
