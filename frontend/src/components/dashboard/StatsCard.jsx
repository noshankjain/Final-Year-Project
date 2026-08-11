import React from 'react';
import { cn } from '../../utils/helpers';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const StatsCard = ({ title, value, subtitle, icon: Icon, color = 'indigo', trend }) => {
  
  const colors = {
    indigo: 'from-indigo-500/20 to-indigo-500/5 text-indigo-400 border-indigo-500/20',
    rose: 'from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20',
  };

  const bgClasses = colors[color];

  return (
    <div className="card hover:scale-[1.02] transition-transform duration-300 relative overflow-hidden group">
      <div className={cn('absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity', `bg-${color}-500`)}></div>
      
      <div className="flex justify-between items-start mb-4">
        <div className={cn('p-3 rounded-xl bg-gradient-to-br border', bgClasses)}>
          <Icon size={24} />
        </div>
        
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
            trend > 0 ? 'text-emerald-400 bg-emerald-500/10' : 
            trend < 0 ? 'text-rose-400 bg-rose-500/10' : 'text-slate-400 bg-slate-500/10'
          )}>
            {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-3xl font-bold text-white mb-1 tracking-tight">{value}</h3>
        <p className="text-sm font-medium text-slate-300">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-2">{subtitle}</p>}
      </div>
    </div>
  );
};

export default StatsCard;
