import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, ChevronsLeft, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../auth';
import { cn } from '../lib/cn';
import { NAV_GROUPS } from '../routes';

/**
 * Sidebar — collapsible responsive navigation.
 *
 * Modes:
 *   - Desktop (lg+): fixed rail, can collapse to icon-only (state persisted)
 *   - Tablet (md): icon-rail by default
 *   - Mobile (<md): hidden by default, opens as overlay drawer with backdrop
 *
 * Features:
 *   - Grouped nav (Overview / Operations / Users / AI Telemetry / Comms / System)
 *   - Unique Lucide icon per item (no duplicates)
 *   - Active state via NavLink (auto-handles `end` for /dashboard exact match)
 *   - Persistence: collapse state in localStorage
 *   - Keyboard accessible (Tab through items, Enter to navigate)
 *   - Animated mobile drawer (framer-motion)
 *   - ARIA: role=navigation, aria-label, aria-current on active link
 */

interface SidebarProps {
  /** Mobile drawer open state (controlled by parent on small screens) */
  mobileOpen: boolean;
  /** Close mobile drawer (called on backdrop click, ESC, or nav) */
  onMobileClose: () => void;
}

const STORAGE_KEY = 'resqdrive-sidebar-collapsed';

function getInitialCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<boolean>(getInitialCollapsed);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  // Render the inner nav (shared between desktop rail and mobile drawer)
  const renderNav = (isMobile: boolean) => (
    <nav
      className="flex-1 overflow-y-auto px-3 py-4"
      aria-label="Primary navigation"
    >
      {NAV_GROUPS.map((group) => {
        // Hide empty groups
        if (group.items.length === 0) return null;
        return (
          <div key={group.group} className="mb-5">
            {!collapsed || isMobile ? (
              <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600">
                {group.group}
              </h3>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={isMobile ? onMobileClose : undefined}
                      // `end` ensures /dashboard is only active on exact match (not /dashboard/foo)
                      end={item.to === '/dashboard'}
                      className={({ isActive }: { isActive: boolean }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                          collapsed && !isMobile && 'justify-center px-0',
                          isActive
                            ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100',
                        )
                      }
                    >
                      <Icon size={18} className="shrink-0" />
                      {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const renderUserFooter = (isMobile: boolean) => (
    <div className="border-t border-gray-200 p-3 dark:border-gray-800">
      <div className={cn('flex items-center gap-3', collapsed && !isMobile && 'justify-center')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white">
          {user?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
        </div>
        {(!collapsed || isMobile) && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{user?.fullName}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
        )}
        {(!collapsed || isMobile) && (
          <button
            onClick={logout}
            aria-label="Log out"
            className="rounded-md p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <ChevronsLeft size={18} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ─── Desktop rail (hidden on <lg) ──────────────────────────────── */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30',
          'border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950',
          'transition-[width] duration-200',
          collapsed ? 'lg:w-[68px]' : 'lg:w-64',
        )}
        aria-label="Sidebar"
      >
        <SidebarHeader collapsed={collapsed} onToggle={toggleCollapsed} isMobile={false} />
        {renderNav(false)}
        {renderUserFooter(false)}
      </aside>

      {/* ─── Mobile drawer (overlay on <lg) ────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden">
            {/* Backdrop */}
            <motion.button
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onMobileClose}
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-gray-950/60 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
              aria-label="Mobile navigation"
            >
              <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
                <SidebarBrand />
                <button
                  onClick={onMobileClose}
                  aria-label="Close sidebar"
                  className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                >
                  <X size={18} />
                </button>
              </div>
              {renderNav(true)}
              {renderUserFooter(true)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Brand + collapse toggle (desktop only) ────────────────────────────────
function SidebarHeader({
  collapsed,
  onToggle,
  isMobile,
}: {
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
      {collapsed && !isMobile ? (
        <div className="mx-auto">
          <SidebarBrand iconOnly />
        </div>
      ) : (
        <SidebarBrand />
      )}
      <button
        onClick={onToggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="hidden lg:inline-flex items-center justify-center rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </div>
  );
}

function SidebarBrand({ iconOnly = false }: { iconOnly?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white font-bold">
        R
      </div>
      {!iconOnly && (
        <div>
          <p className="text-base font-bold leading-tight text-gray-900 dark:text-white">
            ResQ<span className="text-primary-600">Drive</span>
          </p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-500">Admin</p>
        </div>
      )}
    </div>
  );
}
