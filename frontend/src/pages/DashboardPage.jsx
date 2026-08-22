import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, Clock, Pulse, ChartLineUp, Plus } from '@phosphor-icons/react';
import CasesTable from '../components/dashboard/CasesTable';
import api from '../services/api';
import toast from 'react-hot-toast';

// Stat card — no gradient, teal accent on value only (§4.2 color lock)
const StatCard = ({ label, value, icon: Icon, accent, delay = 0 }) => (
  <div
    className="surface p-5 animate-fade-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-start justify-between mb-4">
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}15`, color: accent }}
      >
        <Icon size={16} weight="regular" />
      </div>
    </div>
    <p className="text-2xl font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
      {value}
    </p>
  </div>
);

// Skeleton stat card
const StatSkeleton = () => (
  <div className="surface p-5">
    <div className="skeleton h-4 w-24 mb-4" />
    <div className="skeleton h-7 w-16" />
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/cases?limit=100')
      .then(res => setCases(Array.isArray(res.data.data) ? res.data.data : []))
      .catch(() => toast.error('Failed to load cases'))
      .finally(() => setLoading(false));
  }, []);

  const complete     = cases.filter(c => c.status === 'complete');
  const pending      = cases.filter(c => c.status === 'pending' || c.status === 'processing').length;
  const malignant    = complete.filter(c => c.inferenceResult?.diagnosis === 'malignant').length;
  const malignantPct = complete.length ? Math.round((malignant / complete.length) * 100) : 0;
  const avgSurvival  = complete.length
    ? Math.round(complete.reduce((s, c) => s + (c.inferenceResult?.survivalProbability || 0), 0) / complete.length * 100)
    : 0;

  return (
    // No welcome emoji (§3.D), no gradient-text headline (§9.A)
    <div className="space-y-8 pb-16">
      {/* Page header — plain text, left-aligned */}
      <div className="animate-fade-up">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Good to see you, {user?.name?.split(' ')[0] || 'Doctor'}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Here is an overview of your current caseload.
        </p>
      </div>

      {/* Stats grid — 4 cols on desktop, 2 on tablet, 1 on mobile (CSS Grid, not flex math) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Total Cases"       value={cases.length}        icon={Users}       accent="var(--accent)"  delay={0}   />
            <StatCard label="Awaiting Analysis" value={pending}             icon={Clock}       accent="#f59e0b"        delay={50}  />
            <StatCard label="Malignant Rate"    value={`${malignantPct}%`}  icon={Pulse}       accent="#f43f5e"        delay={100} />
            <StatCard label="Avg Survival Est." value={`${avgSurvival}%`}   icon={ChartLineUp} accent="#10b981"        delay={150} />
          </>
        )}
      </div>

      {/* Recent cases — split header, NOT split-header pattern (it's just title + link) */}
      <div className="animate-fade-up anim-d3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Recent Cases
            </h3>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Latest 10 submissions.
            </p>
          </div>
          <button
            onClick={() => navigate('/cases')}
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            View all
          </button>
        </div>

        {loading ? (
          <div className="surface p-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="skeleton h-12 w-full" />)}
          </div>
        ) : (
          <CasesTable
            cases={cases.slice(0, 10)}
            onViewCase={id => navigate(`/cases/${id}/results`)}
          />
        )}
      </div>

      {/* FAB — teal, no gradient, no pulse-glow, rotate on hover only */}
      <button
        onClick={() => navigate('/cases/new')}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-xl flex items-center justify-center shadow-lg z-40 transition-transform hover:scale-105 active:scale-95"
        style={{ background: 'var(--accent)', color: '#23212C', boxShadow: '0 8px 24px var(--accent-glow)' }}
        title="New case"
        id="fab-new-case"
        aria-label="Create new case"
      >
        <Plus size={24} weight="bold" />
      </button>
    </div>
  );
};

export default DashboardPage;
