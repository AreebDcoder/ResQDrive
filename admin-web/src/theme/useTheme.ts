import { useContext } from 'react';
import { ThemeContext } from './ThemeProvider';

/**
 * useTheme — access + control the current light/dark theme.
 *
 * Usage:
 *   const { theme, toggleTheme, setTheme } = useTheme();
 *   <button onClick={toggleTheme}>{theme === 'dark' ? <Sun/> : <Moon/>}</button>
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
