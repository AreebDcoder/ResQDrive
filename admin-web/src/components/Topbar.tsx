import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, Sun, Moon, ChevronRight, User, LogOut, Settings, RefreshCw, Bell,
} from 'lucide-react';
import { useTheme } from '../theme/useTheme';
import { useAuth } from '../auth';
import { cn } from '../lib/cn';
import { PAGE_TITLES } from '../routes';

/**
 * Topbar — sticky top app bar.
 *
 * Contains:
 *   - Mobile hamburger (toggles Sidebar drawer)
 *   - Breadcrumb (auto-derived from route)
 *   - Refresh (page reload)
 *   - Theme toggle (light/dark, persisted)
 *   - User avatar dropdown (Profile / Logout)
 *
 * Accessibility:
 *   - All icon buttons have aria-label
 *   - Dropdown closes on ESC, click-outside, or item click
 *   - Focus-visible rings throughout
 */

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/80">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white lg:hidden"
      >
        <Menu size={20} />
      </button>

      <Breadcrumb />

      <div className="ml-auto flex items-center gap-1">
        {/* Refresh */}
        <button
          onClick={() => window.location.reload()}
          aria-label="Refresh page"
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <RefreshCw size={18} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications (placeholder — Batch 8 will wire this) */}
        <button
          aria-label="Notifications"
          className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger-500" aria-hidden />
        </button>

        {/* User menu */}
        <UserMenu
          user={user}
          onProfile={() => navigate('/profile')}
          onLogout={logout}
        />
      </div>
    </header>
  );
}

// ─── Breadcrumb (auto-derived from current route) ──────────────────────────
function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Dashboard</span>;
  }

  // Build breadcrumb from segments. For /incidents/:id → [Incidents, Incident Detail]
  const crumbs: { label: string; to?: string }[] = [];
  let path = '';
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    path += `/${seg}`;
    // Try exact match (e.g. /incidents)
    const exactKey = `/${seg}`;
    let label = PAGE_TITLES[exactKey];
    if (!label && i > 0) {
      // Try as param route (e.g. /incidents/:id)
      const parentPath = `/${segments[i - 1]}/:id`;
      label = PAGE_TITLES[parentPath];
    }
    if (!label) {
      // Heuristic: if it looks like a UUID, just say "Detail"
      label = seg.length > 20 ? 'Detail' : seg.charAt(0).toUpperCase() + seg.slice(1);
    }
    // Last segment = current page (no link); others = link to parent path
    const isLast = i === segments.length - 1;
    crumbs.push({ label, to: isLast ? undefined : path });
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={14} className="text-gray-400" aria-hidden />}
          {crumb.to ? (
            <Link
              to={crumb.to}
              className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="font-semibold text-gray-900 dark:text-white">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

// ─── User dropdown menu ──────────────────────────────────────────────────────
interface UserMenuProps {
  user: { fullName: string; email: string } | null;
  onProfile: () => void;
  onLogout: () => void;
}

function UserMenu({ user, onProfile, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click-outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open user menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-gray-800"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
          {user.fullName.charAt(0).toUpperCase()}
        </div>
        <span className="hidden text-sm font-medium text-gray-700 dark:text-gray-200 sm:inline">
          {user.fullName.split(' ')[0]}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-800">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{user.fullName}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onProfile();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <User size={16} />
            Profile
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onProfile();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Settings size={16} />
            Settings
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2 border-t border-gray-200 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 dark:border-gray-800 dark:text-danger-400 dark:hover:bg-danger-900/20"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
