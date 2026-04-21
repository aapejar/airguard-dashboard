import { useState } from 'react';
import { LayoutDashboard, ScrollText, Sliders, Settings, LogOut, ChevronLeft, ChevronRight, Shield, FileCode2, Users, ClipboardList } from 'lucide-react';
import { SidebarNavItem } from './SidebarNavItem';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types/sensor';
import { cn } from '@/lib/utils';

interface NavDef {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  roles: UserRole[];
}

const allNav: NavDef[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'operator', 'user'] },
  { to: '/logs', icon: ScrollText, label: 'Data Logs', roles: ['admin', 'operator', 'user'] },
  { to: '/control', icon: Sliders, label: 'Control', roles: ['admin', 'operator'] },
  { to: '/design', icon: FileCode2, label: 'System Design', roles: ['admin', 'operator', 'user'] },
  { to: '/audit', icon: ClipboardList, label: 'Audit Log', roles: ['admin'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
  { to: '/users', icon: Users, label: 'Users', roles: ['admin'] },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const navItems = allNav.filter(item => user && item.roles.includes(user.role));

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <Shield className="h-7 w-7 text-primary shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-foreground tracking-wide">AirGuard Pro</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Monitoring</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(item => (
          <SidebarNavItem key={item.to} to={item.to} icon={item.icon} label={item.label} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-2">
        {!collapsed && user && (
          <div className="px-3 py-2">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-sm font-medium text-foreground">{user.username}</p>
            <span className="status-badge status-online mt-1 text-[10px]">{user.role}</span>
          </div>
        )}
        <button
          onClick={() => logout('manual')}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
