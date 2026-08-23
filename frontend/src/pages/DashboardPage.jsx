import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, Clock, Pulse, ChartLineUp, Plus } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import CasesTable from '../components/dashboard/CasesTable';
import CountUp from '../components/shared/CountUp';
import api from '../services/api';
import toast from 'react-hot-toast';

// Stat card — CountUp on value, stagger reveal via motion.div (Prompt 4.3 + 4.1)
const StatCard = ({ label, value, decimals = 0, suffix = '', prefix = '', icon: Icon, accent, accentDim, delay = 0 }) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className="surface p-5"
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </p>
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: accentDim || 'var(--accent-dim)', color: accent }}
        >
          <Icon size={16} weight="regular" />
        </div>
      </div>
      <p className="text-2xl font-semibold font-mono" style={{ color: 'var(--text-primary)' }}>
        <CountUp value={value} decimals={decimals} suffix={suffix} prefix={prefix} duration={900} />
      </p>
    </motion.div>
  );
};

// Skeleton stat card — matches loaded card dimensions exactly
const StatSkeleton = ({ delay = 0 }) => (
  <motion.div
    className="surface p-5"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3, delay }}
  >
    <div className="skeleton h-4 w-28 mb-4" />
    <div className="skeleton h-7 w-20" />
  </motion.div>
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
      {/* Page header — plain text, left-aligned, fades in */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Good to see you, {user?.name?.split(' ')[0] || 'Doctor'}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Here is an overview of your current caseload.
        </p>
      </motion.div>

      {/* Stats grid — 4 cols on desktop, 2 on tablet, 1 on mobile (CSS Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatSkeleton delay={0} />
            <StatSkeleton delay={0.04} />
            <StatSkeleton delay={0.08} />
            <StatSkeleton delay={0.12} />
          </>
        ) : (
          <>
            <StatCard
              label="Total Cases"
              value={cases.length}
              icon={Users}
              accent="#7D4047"
              accentDim="rgba(125,64,71,0.12)"
              delay={0}
            />
            <StatCard
              label="Awaiting Analysis"
              value={pending}
              icon={Clock}
              accent="#966A28"
              accentDim="rgba(150,106,40,0.12)"
              delay={0.06}
            />
            <StatCard
              label="Malignant Rate"
              value={malignantPct}
              suffix="%"
              icon={Pulse}
              accent="#C03040"
              accentDim="rgba(192,48,64,0.12)"
              delay={0.12}
            />
            <StatCard
              label="Avg Survival Est."
              value={avgSurvival}
              suffix="%"
              icon={ChartLineUp}
              accent="#2B7A57"
              accentDim="rgba(43,122,87,0.12)"
              delay={0.18}
            />
          </>
        )}
      </div>

      {/* Recent cases */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
      >
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
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-12 w-full" />)}
          </div>
        ) : (
          <CasesTable
            cases={cases.slice(0, 10)}
            onViewCase={id => navigate(`/cases/${id}/results`)}
          />
        )}
      </motion.div>

      {/* FAB — Vanilla fill, Cosmic icon, no pulse-glow */}
      <button
        onClick={() => navigate('/cases/new')}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-xl flex items-center justify-center shadow-lg z-40 transition-transform hover:scale-105 active:scale-95"
        style={{ background: 'var(--accent)', color: '#F1ECE6', boxShadow: '0 8px 24px var(--accent-glow)' }}
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
