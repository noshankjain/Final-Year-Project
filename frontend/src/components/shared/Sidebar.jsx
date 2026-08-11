import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, PlusCircle, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/helpers';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: FolderOpen, label: 'Cases', path: '/cases', end: true },
    { icon: PlusCircle, label: 'New Case', path: '/cases/new' },
  ];

  return (
    <aside className={cn(
      "glass rounded-none border-t-0 border-l-0 border-b-0 flex flex-col transition-all duration-300 relative bg-navy-900/80 z-50",
      collapsed ? "w-20" : "w-64"
    )}>
      <div className="h-20 flex items-center justify-center border-b border-white/10 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-xl animate-pulse-glow">
            🧬
          </div>
          {!collapsed && <span className="font-bold text-xl gradient-text whitespace-nowrap tracking-tight">CancerDx AI</span>}
        </div>
      </div>

      <div className="flex-1 py-6 px-4 flex flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) => cn(
              isActive ? 'sidebar-item-active' : 'sidebar-item',
              collapsed && 'justify-center px-0'
            )}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={20} className={cn(collapsed && "mx-auto")} />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </div>

      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-24 bg-navy-800 border border-white/20 text-slate-300 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors z-50"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="p-4 border-t border-white/10 mt-auto">
        <div className={cn("glass p-3 flex items-center gap-3", collapsed && "justify-center")}>
          <Activity className="text-emerald-400 shrink-0" size={20} />
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-emerald-400 truncate">System Online</p>
              <p className="text-[10px] text-slate-400 truncate">v2.1.0 • Connected</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
