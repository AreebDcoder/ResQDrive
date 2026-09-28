import React, { createContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors } from './tokens';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  colors: typeof darkColors;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * ThemeProvider — manages light/dark theme for the mobile app.
 *
 * - Default theme: follows system preference via useColorScheme()
 * - User can manually toggle via setTheme/toggleTheme
 * - Theme preference persistence to AsyncStorage will be added in Batch 7
 *   (requires installing @react-native-async-storage/async-storage)
 * - Exposes `useTheme()` hook for components to access current theme + colors
 *
 * Note: React Native's useColorScheme returns 'light' | 'dark' | null.
 * We default to 'dark' (matching the existing app aesthetic) when null.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>(
    systemScheme === 'light' ? 'light' : 'dark'
  );
  const [userOverride, setUserOverride] = useState<Theme | null>(null);

  // Update system preference when it changes (and no manual override)
  useEffect(() => {
    if (systemScheme && !userOverride) {
      setThemeState(systemScheme);
    }
  }, [systemScheme, userOverride]);

  const setTheme = (next: Theme) => {
    setUserOverride(next);
    setThemeState(next);
    // TODO: Batch 7 — persist to AsyncStorage once installed
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export { ThemeContext };
