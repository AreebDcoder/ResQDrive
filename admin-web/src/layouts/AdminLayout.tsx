import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { cn } from '../lib/cn';

/**
 * AdminLayout — the authenticated app shell.
 *
 * Structure:
 *   [Sidebar (fixed, lg)] [Topbar + main content scrollable]
 *
 * On small screens Sidebar becomes an overlay drawer triggered by Topbar's hamburger.
 *
 * Includes a "scroll to top on route change" behavior — when the user navigates,
 * the main content area resets its scroll position to top (better UX than the
 * previous behavior of preserving scroll across unrelated routes).
 */

export default function AdminLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // Scroll main content to top on route change
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) main.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Offset main content by sidebar width on lg+ (sidebar is fixed) */}
      <div className="lg:pl-64">
        <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />
        <main
          id="main-content"
          className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8"
          tabIndex={-1}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
