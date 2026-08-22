import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  SquaresFour,
  Folder,
  Plus,
  CaretLeft,
  CaretRight,
  Dna,
} from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/helpers';

// Phosphor icons (§3.C — one family per project, no emoji, no Lucide)
const navItems = [
  { icon: SquaresFour, label: 'Dashboard',  path: '/dashboard' },
  { icon: Folder,      label: 'Cases',      path: '/cases', end: true },
  { icon: Plus,        label: 'New Case',   path: '/cases/new' },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  return (
    <aside
      className={cn(
        'flex flex-col flex-shrink-0 transition-all duration-300 relative z-50',
        'border-r',
        collapsed ? 'w-[68px]' : 'w-[220px]'
      )}
      style={{
        background:   'var(--surface-raised)',
        borderColor:  'var(--surface-border)',
      }}
    >
      {/* Logo — no emoji, no gradient text, no pulse glow */}
      <div
        className="flex items-center gap-3 px-4 h-[60px] border-b flex-shrink-0"
        style={{ borderColor: 'var(--surface-border)' }}
      >
        {/* Icon mark — geometric, not emoji */}
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)', color: '#23212C' }}
        >
          <Dna size={18} weight="bold" />
        </div>
        {!collapsed && (
          <span
            className="font-semibold text-[15px] tracking-tight whitespace-nowrap"
            style={{ color: 'var(--text-primary)' }}
          >
            OncoSight
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              cn('nav-item', isActive && 'nav-item-active', collapsed && 'justify-center px-0')
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={18} weight="regular" className="flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[76px] w-6 h-6 rounded-full flex items-center justify-center z-50 transition-colors"
        style={{
          background:   'var(--surface-overlay)',
          border:       '1px solid var(--surface-border-hi)',
          color:        'var(--text-secondary)',
        }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <CaretRight size={12} weight="bold" /> : <CaretLeft size={12} weight="bold" />}
      </button>

      {/* User footer — no version string, no status dot */}
      <div
        className="p-3 border-t flex-shrink-0"
        style={{ borderColor: 'var(--surface-border)' }}
      >
        <div className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
          {/* Avatar initial ring — no gradient, just teal border */}
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-glow)' }}
          >
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.name || 'User'}
              </p>
              <p className="text-xs truncate capitalize" style={{ color: 'var(--text-secondary)' }}>
                {user?.role || 'physician'}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
