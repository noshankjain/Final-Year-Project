import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Menu, LogOut, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  
  const getPageTitle = () => {
    if (location.pathname === '/dashboard') return 'Dashboard';
    if (location.pathname.startsWith('/cases/new')) return 'New Case Analysis';
    if (location.pathname.startsWith('/cases')) return 'Cases';
    return 'CancerDx AI';
  };

  return (
    <header className="h-20 glass rounded-none border-t-0 border-l-0 border-r-0 flex items-center justify-between px-6 sticky top-0 z-40 bg-navy-900/80">
      <div className="flex items-center gap-4">
        {/* Hamburger for mobile could go here */}
        <h1 className="text-xl font-bold text-slate-100">{getPageTitle()}</h1>
      </div>
      
      <div className="flex items-center gap-6">
        <button className="relative text-slate-400 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-navy-900"></span>
        </button>
        
        <div className="flex items-center gap-4 border-l border-white/10 pl-6">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-200">{user?.name || 'Dr. Smith'}</p>
            <p className="text-xs text-indigo-400">{user?.role || 'Oncologist'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">
            {user?.name?.charAt(0) || 'D'}
          </div>
          <button 
            onClick={logout}
            className="text-slate-400 hover:text-rose-400 p-2 rounded-xl hover:bg-rose-500/10 transition-all"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
