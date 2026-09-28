import { useContext } from 'react';
import { ThemeContext } from './ThemeProvider';

/**
 * useTheme — access + control the current light/dark theme.
 *
 * Usage:
 *   const { theme, toggleTheme, colors } = useTheme();
 *   <View style={{ backgroundColor: colors.background }} />
 *
 * Throws if used outside <ThemeProvider>.
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
