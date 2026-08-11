import React from 'react';
import { cn } from '../../utils/helpers';
import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const normalized = status?.toLowerCase() || 'pending';
  
  const config = {
    pending: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
    processing: { color: 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse', icon: Loader2 },
    complete: { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
    failed: { color: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: AlertCircle },
  };

  const { color, icon: Icon } = config[normalized] || config.pending;

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border', color)}>
      <Icon className={cn('w-3.5 h-3.5', normalized === 'processing' && 'animate-spin')} />
      <span className="capitalize">{normalized}</span>
    </span>
  );
};

export default StatusBadge;
