import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { cn } from '../../utils/helpers';

const DiagnosisCard = ({ diagnosis, confidence }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isMalignant = diagnosis?.toLowerCase() === 'malignant';
  const color = isMalignant ? '#f43f5e' : '#10b981';
  const Icon = isMalignant ? ShieldAlert : ShieldCheck;
  
  const data = [
    { name: 'Confidence', value: confidence * 100 },
    { name: 'Remaining', value: 100 - (confidence * 100) }
  ];

  return (
    <div className="card h-full flex flex-col items-center justify-center relative overflow-hidden group">
      <div className={cn('absolute inset-0 opacity-5 transition-opacity group-hover:opacity-10', isMalignant ? 'bg-rose-500' : 'bg-emerald-500')}></div>
      
      <h3 className="text-slate-400 font-medium mb-6 w-full text-left uppercase tracking-wider text-sm">AI Diagnosis</h3>
      
      <div className="relative w-48 h-48 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={90}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={1500}
            >
              <Cell key="cell-0" fill={color} />
              <Cell key="cell-1" fill="rgba(255,255,255,0.05)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {mounted && (
            <span className="text-3xl font-bold text-white animate-fade-in delay-500">
              {(confidence * 100).toFixed(1)}%
            </span>
          )}
          <span className="text-xs text-slate-400">Confidence</span>
        </div>
      </div>

      <div className={cn(
        "flex items-center gap-3 px-6 py-3 rounded-2xl border",
        isMalignant ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
      )}>
        <Icon size={24} className={isMalignant ? "animate-pulse" : ""} />
        <span className="text-2xl font-bold tracking-tight uppercase">
          {diagnosis}
        </span>
      </div>
    </div>
  );
};

export default DiagnosisCard;
