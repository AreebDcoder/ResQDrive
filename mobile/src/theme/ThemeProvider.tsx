import React, { createContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors } from './tokens';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'resqdrive_theme';

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
 * - Batch 13: Theme preference persisted to AsyncStorage
 * - Exposes `useTheme()` hook for components to access current theme + colors
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('dark');
  const [userOverride, setUserOverride] = useState<Theme | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load saved theme from AsyncStorage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') {
          setUserOverride(saved);
          setThemeState(saved);
        } else if (systemScheme) {
          setThemeState(systemScheme);
        }
      } catch (e) {
        // AsyncStorage not available (web) — fall back to system scheme
      }
      setLoaded(true);
    };
    loadTheme();
  }, []);

  // Update system preference when it changes (and no manual override)
  useEffect(() => {
    if (loaded && systemScheme && !userOverride) {
      setThemeState(systemScheme);
    }
  }, [systemScheme, userOverride, loaded]);

  const setTheme = (next: Theme) => {
    setUserOverride(next);
    setThemeState(next);
    // Batch 13: Persist to AsyncStorage
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {});
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
