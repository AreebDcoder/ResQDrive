import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

/**
 * ThemeProvider — manages light/dark theme.
 *
 * - Default theme: prefers-color-scheme on first visit, else 'dark' (matches existing app style).
 * - Choice persisted to localStorage under 'resqdrive-theme'.
 * - Adds/removes 'dark' class on <html> element.
 * - Tailwind darkMode: 'class' is set in tailwind.config.js.
 *
 * Note for Batch 1: even though the theme system is in place, all existing pages
 * still hardcode bg-gray-800 etc. (without dark: prefixes). This means:
 *   - In dark mode (default): everything looks like the current app.
 *   - In light mode: body bg becomes white but cards stay dark gray — looks weird.
 *   This is EXPECTED. Batch 2 refactors all pages to use theme tokens / dark: prefixes.
 */

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'resqdrive-theme';

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  // Default to dark (matches current app). To respect prefers-color-scheme use:
  // return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return 'dark';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (next: Theme) => setThemeState(next);
  const toggleTheme = () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Re-export useTheme here too for convenience
export { useTheme } from './useTheme';
