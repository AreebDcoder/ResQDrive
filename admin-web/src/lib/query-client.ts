import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query client — single instance shared by the whole app.
 *
 * Defaults:
 * - staleTime: 30s  → background refetch after 30s of inactivity
 * - retry: 1        → only retry failed requests once (don't hammer backend)
 * - refetchOnWindowFocus: true → refresh when user returns to tab
 * - refetchOnReconnect: true
 *
 * Per-hook overrides are encouraged (e.g. emergency monitor wants 5s refetchInterval).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
