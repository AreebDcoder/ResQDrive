import { LayoutDashboard, AlertTriangle, Users, LogOut, UserCircle, Activity, Shield, Bell, Download } from 'lucide-react';
import { useAuth } from '../auth';

interface SidebarProps {
  currentPage: string;
      onNavigate: (page: 'dashboard' | 'incidents' | 'monitor' | 'crash-logs' | 'voice-logs' | 'damage' | 'repair' | 'workshop' | 'emergency-numbers' | 'health' | 'users' | 'profile' | 'notifications' | 'export') => void;
  activePageLabel?: string;
}

export default function Sidebar({ currentPage, onNavigate, activePageLabel }: SidebarProps) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'incidents' as const, label: 'Incidents', icon: AlertTriangle },
    { id: 'monitor' as const, label: 'Emergency Monitor', icon: Activity },
    { id: 'crash-logs' as const, label: 'Crash Detection', icon: AlertTriangle },
    { id: 'voice-logs' as const, label: 'Voice Commands', icon: UserCircle },
    { id: 'damage' as const, label: 'Damage Assessment', icon: AlertTriangle },
    { id: 'repair' as const, label: 'Repair Costs', icon: AlertTriangle },
    { id: 'workshop' as const, label: 'Workshop Queue', icon: Users },
    { id: 'emergency-numbers' as const, label: 'Emergency Numbers', icon: Shield },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'health' as const, label: 'System Health', icon: Shield },
    { id: 'users' as const, label: 'Users', icon: Users },
    { id: 'export' as const, label: 'Data Export', icon: Download },
    { id: 'profile' as const, label: 'Profile', icon: UserCircle },
  ];

  return (
    <aside className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">
          ResQ<span className="text-red-600">Drive</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">Admin Dashboard</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePageLabel ? false : currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
        {activePageLabel && (
          <div className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-gray-800 text-gray-300">
            <AlertTriangle size={18} />
            {activePageLabel}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="px-4 py-2 mb-2">
          <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}