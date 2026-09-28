/**
 * Design tokens — centralized color/spacing/radius/shadow/typography system.
 *
 * This file is the SINGLE SOURCE OF TRUTH for all visual constants in the app.
 * No screen or component should hardcode hex colors — import from here instead.
 *
 * The palette mirrors the admin-web design system (Batch 1) so both surfaces
 * share the same visual language:
 *   primary  = indigo  (brand)
 *   success  = emerald (positive actions: resolve, approve, verify)
 *   warning  = amber   (caution: pending, low confidence)
 *   danger   = rose    (destructive: delete, archive, SOS)
 *   info     = sky     (informational: links, neutral badges)
 *
 * Each semantic color has 11 shades (50–950) matching Tailwind's palette.
 */

// ─── Color tokens ────────────────────────────────────────────────────────────

export const colors = {
  primary: {
    50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc',
    400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca',
    800: '#3730a3', 900: '#312e81', 950: '#1e1b4b',
  },
  success: {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
    400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
    800: '#065f46', 900: '#064e3b', 950: '#022c22',
  },
  warning: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
    400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
    800: '#92400e', 900: '#78350f', 950: '#451a03',
  },
  danger: {
    50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5',
    400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
    800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a',
  },
  info: {
    50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc',
    400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1',
    800: '#075985', 900: '#0c4a6e', 950: '#082f49',
  },
  neutral: {
    50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db',
    400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151',
    800: '#1f2937', 900: '#111827', 950: '#030712',
  },
} as const;

// ─── Dark theme surface colors ───────────────────────────────────────────────

export const darkColors = {
  background: '#030712',       // neutral-950
  surface: '#111827',          // neutral-900
  surfaceElevated: '#1f2937',  // neutral-800
  border: '#374151',           // neutral-700
  text: '#f9fafb',             // neutral-50
  textSecondary: '#9ca3af',    // neutral-400
  textTertiary: '#6b7280',     // neutral-500
  overlay: 'rgba(0, 0, 0, 0.6)',
};

// ─── Light theme surface colors ──────────────────────────────────────────────

export const lightColors = {
  background: '#f9fafb',       // neutral-50
  surface: '#ffffff',
  surfaceElevated: '#f3f4f6',  // neutral-100
  border: '#e5e7eb',           // neutral-200
  text: '#111827',             // neutral-900
  textSecondary: '#4b5563',    // neutral-600
  textTertiary: '#9ca3af',     // neutral-400
  overlay: 'rgba(0, 0, 0, 0.4)',
};

// ─── Spacing scale ───────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
} as const;

// ─── Border radius ────────────────────────────────────────────────────────────

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

// ─── Shadow presets ─────────────────────────────────────────────────────────

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

// ─── Typography ────────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: 'Inter',
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 30,
    '5xl': 36,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

// ─── Animation durations ──────────────────────────────────────────────────────

export const animations = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

// ─── Z-index layers ───────────────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  drawer: 30,
  modal: 40,
  toast: 50,
  banner: 60,
} as const;
