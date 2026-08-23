import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { SignOut } from '@phosphor-icons/react';
import { useLocation } from 'react-router-dom';

// Page title map — no emoji, plain language (§3.D, §9.D)
const PAGE_TITLES = {
  '/dashboard':  'Dashboard',
  '/cases/new':  'New Case',
  '/cases':      'Case Directory',
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    if (location.pathname.startsWith('/cases/') && location.pathname.endsWith('/results')) {
      return 'Analysis Report';
    }
    return PAGE_TITLES[location.pathname] || 'OncoSight';
  };

  return (
    // Sticky top nav, max height 60px (§4.7 nav height cap: 80px max)
    <header
      className="h-[60px] flex items-center justify-between px-6 flex-shrink-0 sticky top-0 z-40"
      style={{
        background:  'rgba(207, 199, 190, 0.95)',
        borderBottom: '1px solid var(--surface-border-hi)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 1px 0 rgba(46,46,46,0.08)',
      }}
    >
      {/* Left: page title — plain h1, no gradient, no giant scale */}
      <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
        {getPageTitle()}
      </h1>

      {/* Right: user identity + logout */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {user?.name || 'Physician'}
          </p>
          <p className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>
            {user?.role || 'physician'}
          </p>
        </div>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-glow)' }}
        >
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>

        {/* Logout — no Bell notification dot (§9.F) */}
        <button
          onClick={logout}
          className="flex items-center justify-center w-8 h-8 rounded-md transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.background = 'rgba(244,63,94,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
          title="Sign out"
          aria-label="Sign out"
        >
          <SignOut size={17} weight="regular" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
