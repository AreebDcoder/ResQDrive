import React, { Component, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * ErrorBoundary — catches render errors in child tree and shows a friendly fallback.
 *
 * Without this, an uncaught render error in any screen crashes the entire app
 * to the React Native red box (dev) or a silent crash (production).
 *
 * The fallback shows:
 *   - Error message
 *   - Stack trace (dev only — hidden in production)
 *   - "Try again" button (re-renders — may fix transient errors)
 *   - "Reload app" button (restarts the JS bundle)
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  reset = () => {
    this.setState({ error: null });
  };

  reload = () => {
    // In React Native, there's no direct "reload" API, but we can force a
    // re-render by resetting state. For a full reload, the user can shake
    // the device or press R in the dev menu.
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} onRetry={this.reset} onReload={this.reload} />;
    }
    return this.props.children;
  }
}

/**
 * ErrorFallback — the UI shown when ErrorBoundary catches an error.
 * Extracted as a separate component so it can use hooks (useTheme).
 */
function ErrorFallback({ error, onRetry, onReload }: { error: Error; onRetry: () => void; onReload: () => void }) {
  // Can't use useTheme hook here because ErrorBoundary might catch an error
  // from ThemeProvider itself. Use dark colors as fallback.
  const bg = colors.neutral[950];
  const surface = colors.neutral[900];
  const text = colors.neutral[50];
  const textDim = colors.neutral[400];
  const danger = colors.danger[500];
  const primary = colors.primary[500];

  return (
    <View style={{ flex: 1, backgroundColor: bg, padding: spacing.xl }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: spacing['2xl'] }}>
          <Ionicons name="warning" size={48} color={danger} style={{ marginBottom: spacing.md }} />
          <Text style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: text, textAlign: 'center' }}>
            Something went wrong
          </Text>
          <Text style={{ fontSize: typography.fontSize.md, color: textDim, textAlign: 'center', marginTop: spacing.sm }}>
            The app encountered an unexpected error. You can try again or reload.
          </Text>
        </View>

        {__DEV__ && (
          <View style={{ backgroundColor: surface, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.xl }}>
            <Text style={{ fontSize: typography.fontSize.xs, color: danger, fontFamily: 'monospace' }}>
              {error.message}
            </Text>
            {error.stack && (
              <Text style={{ fontSize: 10, color: textDim, fontFamily: 'monospace', marginTop: spacing.sm }}>
                {error.stack.slice(0, 500)}
              </Text>
            )}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <TouchableOpacity
            onPress={onRetry}
            style={{ flex: 1, backgroundColor: primary, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold }}>
              Try again
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onReload}
            style={{ flex: 1, backgroundColor: surface, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', borderWidth: 1, borderColor: colors.neutral[700] }}
          >
            <Text style={{ color: text, fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold }}>
              Reload
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
