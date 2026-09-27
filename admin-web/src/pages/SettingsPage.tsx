import { useNavigate } from 'react-router-dom';
import { Settings, Palette, Bell, Shield, LogOut, Moon, Sun, Database, Code } from 'lucide-react';
import { useAuth } from '../auth';
import { useTheme } from '../theme/useTheme';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Switch } from '../components/ui/Switch';

/**
 * SettingsPage — admin personal preferences (minimal in Batch 8).
 *
 * Sections:
 *   1. Appearance — theme toggle (light/dark)
 *   2. Account — show user info + Logout button (placeholder for 2FA in future)
 *   3. System — quick links to Data Export / Audit Log / System Health
 *
 * Future batches could add:
 *   - Per-user notification preferences
 *   - 2FA setup
 *   - API token management
 *   - Session management
 */
export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Personal preferences + system quick links.</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-primary-500" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>Choose how the admin panel looks on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon size={20} className="text-gray-400" /> : <Sun size={20} className="text-warning-500" />}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{theme === 'dark' ? 'Dark theme' : 'Light theme'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {theme === 'dark' ? 'Easier on the eyes at night' : 'Best for bright environments'}
                </p>
              </div>
            </div>
            <Switch checked={theme === 'dark'} onChange={toggleTheme} label="Dark mode" />
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-info-500" />
            <CardTitle>Account</CardTitle>
          </div>
          <CardDescription>You are signed in as {user?.email}.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Full name</p>
              <p className="mt-0.5 text-sm text-gray-900 dark:text-white">{user?.fullName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Role</p>
              <p className="mt-0.5 text-sm text-gray-900 dark:text-white">{user?.role}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Phone</p>
              <p className="mt-0.5 text-sm text-gray-900 dark:text-white">{user?.phoneNumber}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Verified</p>
              <p className="mt-0.5 text-sm text-gray-900 dark:text-white">{user?.isVerified ? 'Yes' : 'No'}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/profile')}>Edit profile</Button>
            <Button variant="ghost" size="sm" onClick={logout} leftIcon={<LogOut size={14} />}>Logout</Button>
          </div>
        </CardContent>
      </Card>

      {/* System quick links */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database size={18} className="text-warning-500" />
            <CardTitle>System</CardTitle>
          </div>
          <CardDescription>Quick access to operational pages.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Button variant="secondary" size="sm" onClick={() => navigate('/health')} leftIcon={<Bell size={14} />}>System health</Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/audit-log')} leftIcon={<Code size={14} />}>Audit log</Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/export')} leftIcon={<Database size={14} />}>Data export</Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/notifications/broadcast')} leftIcon={<Bell size={14} />}>Broadcast</Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-gray-500" />
            <CardTitle>About</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            ResQDrive Admin Panel v1.0 — Final Year Project. Built with React 18, Vite, TanStack Query, TanStack Table,
            Recharts, Leaflet, Framer Motion, lucide-react. Backend: NestJS 10 + Prisma 5 + PostgreSQL.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
