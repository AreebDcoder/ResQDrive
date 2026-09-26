import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

/**
 * LoginPage — split-screen design with branding panel + form panel.
 *
 * Features:
 *   - Left panel: brand identity, key value propositions, subtle gradient
 *   - Right panel: form with email/phone + password, show-password toggle,
 *     inline error banner, loading state, keyboard-accessible
 *   - After successful login, redirects to the route the user was trying to
 *     access (passed via location.state.from) — or /dashboard as fallback
 *   - Theme-aware (light/dark)
 */

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from || '/dashboard';

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(emailOrPhone, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || err?.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2 bg-gray-50 dark:bg-gray-950">
      {/* ─── Left: branding panel (hidden on small screens) ───────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:justify-between lg:p-12 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white relative overflow-hidden">
        {/* Decorative background pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
          aria-hidden
        />

        <div className="relative">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur text-2xl font-bold">
              R
            </div>
            <h1 className="text-2xl font-bold">
              ResQ<span className="text-white/70">Drive</span>
            </h1>
          </div>
          <p className="text-sm text-white/70 ml-13 pl-1">Admin Console</p>
        </div>

        <div className="relative space-y-6 max-w-md">
          <h2 className="text-4xl font-bold leading-tight">
            Intelligent accident detection &amp; emergency response platform.
          </h2>
          <p className="text-white/80 text-lg">
            Monitor incidents, manage users, audit AI telemetry, and dispatch
            emergency channels — all from one secure console.
          </p>
          <ul className="space-y-3 text-white/90">
            <li className="flex items-start gap-3">
              <ShieldCheck size={20} className="mt-0.5 shrink-0" />
              <span>Role-based access for drivers, mechanics, and administrators.</span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck size={20} className="mt-0.5 shrink-0" />
              <span>Real-time emergency monitor with multi-channel dispatch.</span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck size={20} className="mt-0.5 shrink-0" />
              <span>AI crash detection, damage assessment &amp; repair cost analytics.</span>
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-white/50">
          © {new Date().getFullYear()} ResQDrive. Final Year Project.
        </p>
      </aside>

      {/* ─── Right: form panel ─────────────────────────────────────────── */}
      <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
        <div className="w-full max-w-md">
          {/* Mobile brand header (only visible on small screens) */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-2xl font-bold text-white">
              R
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              ResQ<span className="text-primary-600">Drive</span>
            </h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Sign in</h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Use your admin credentials to access the console.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-900/50 dark:bg-danger-900/20 dark:text-danger-300"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              id="emailOrPhone"
              label="Email or Phone"
              type="text"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              placeholder="admin@resqdrive.com"
              required
              autoComplete="username"
              autoFocus
              disabled={isLoading}
            />

            <Input
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={isLoading}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isLoading}
              leftIcon={!isLoading ? <ShieldCheck size={16} /> : undefined}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600">
            For demo use: <span className="font-mono">admin@resqdrive.com</span> /{' '}
            <span className="font-mono">AdminPassword123!</span>
          </p>
        </div>
      </main>
    </div>
  );
}

// Suppress unused-import warning for Loader2 (kept for future use)
void Loader2;
