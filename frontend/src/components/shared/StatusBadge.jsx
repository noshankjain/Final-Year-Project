import React from 'react';
import { CheckCircle, Clock, Warning, CircleNotch } from '@phosphor-icons/react';

// StatusBadge — Phosphor icons, CSS variable colors, no purple
// Shape lock: rounded-md (6px) — small element uses --radius-sm
const STATUS_MAP = {
  complete:   { label: 'Complete',   icon: CheckCircle,  bg: 'rgba(16,185,129,0.12)',  color: '#10b981',        border: 'rgba(16,185,129,0.2)' },
  pending:    { label: 'Pending',    icon: Clock,        bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b',        border: 'rgba(245,158,11,0.2)' },
  processing: { label: 'Processing', icon: CircleNotch,  bg: 'rgba(0,212,180,0.12)',   color: 'var(--accent)',  border: 'rgba(0,212,180,0.2)' },
  failed:     { label: 'Failed',     icon: Warning,      bg: 'rgba(244,63,94,0.12)',   color: '#f43f5e',        border: 'rgba(244,63,94,0.2)' },
};

const StatusBadge = ({ status }) => {
  const key = status?.toLowerCase() || 'pending';
  const cfg = STATUS_MAP[key] || STATUS_MAP.pending;
  const Icon = cfg.icon;

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md"
      style={{
        background:  cfg.bg,
        color:       cfg.color,
        border:      `1px solid ${cfg.border}`,
        letterSpacing: '0.03em',
      }}
    >
      <Icon
        size={11}
        weight="bold"
        className={key === 'processing' ? 'animate-spin' : ''}
      />
      {cfg.label}
    </span>
  );
};

export default StatusBadge;
