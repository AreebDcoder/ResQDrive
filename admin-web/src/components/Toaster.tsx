import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';
import { useTheme } from '../theme/useTheme';

/**
 * Toaster — wrapper around sonner with our theme baked in.
 *
 * Usage:
 *   <Toaster />  // place at app root (already done in main.tsx)
 *
 * Then anywhere in code:
 *   import { toast } from 'sonner';
 *   toast.success('Incident resolved');
 *   toast.error('Failed to load dashboard');
 *   toast.promise(asyncFn, { loading, success, error });
 *   toast.confirm(...) // use ConfirmDialog component instead
 *
 * Styles:
 *   - Position: top-right (RTL-aware)
 *   - Theme follows ThemeProvider automatically
 *   - richColors: on (sonner's semantic colors)
 */

export function Toaster(props: Omit<ToasterProps, 'theme'>) {
  const { theme } = useTheme();
  return (
    <SonnerToaster
      theme={theme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          // Match our app's border + radius
          borderRadius: '0.5rem',
        },
      }}
      {...props}
    />
  );
}
