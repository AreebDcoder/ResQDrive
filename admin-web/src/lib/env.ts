/**
 * Environment configuration.
 *
 * Reads Vite env vars (must be prefixed with VITE_ to be exposed to client).
 * Falls back to localhost for development if not set.
 *
 * In production builds, set VITE_API_URL at build time:
 *   VITE_API_URL=https://api.resqdrive.app vite build
 *   or in .env.production
 *
 * @see https://vitejs.dev/guide/env-and-vars.html
 */
export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

export const APP_NAME = 'ResQDrive';
export const APP_VERSION = '1.0.0';
