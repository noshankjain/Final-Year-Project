import React, { useEffect, useState } from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { Activity } from 'lucide-react';
import { cn } from '../../utils/helpers';

const PrognosisCard = ({ survivalProbability, prognosisScore }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const value = survivalProbability * 100;
  
  let color = '#10b981'; // emerald
  let riskText = 'Low Risk';
  if (value < 50) {
    color = '#f43f5e'; // rose
    riskText = 'High Risk';
  } else if (value < 75) {
    color = '#f59e0b'; // amber
    riskText = 'Medium Risk';
  }

  const data = [{ name: 'Survival', value: value, fill: color }];

  return (
    <div className="card h-full flex flex-col">
      <h3 className="text-slate-400 font-medium mb-6 uppercase tracking-wider text-sm flex items-center justify-between">
        <span>5-Year Survival Probability</span>
        <Activity size={16} className="text-slate-500" />
      </h3>
      
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div className="w-full h-48">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              cx="50%" cy="100%" 
              innerRadius="80%" outerRadius="100%" 
              barSize={20} data={data} 
              startAngle={180} endAngle={0}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar 
                minAngle={15} 
                background={{ fill: 'rgba(255,255,255,0.05)' }} 
                clockWise 
                dataKey="value" 
                cornerRadius={10}
                animationDuration={1500}
              />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="absolute bottom-4 flex flex-col items-center">
          {mounted && (
            <span className="text-4xl font-bold text-white mb-1 animate-fade-in delay-500">
              {value.toFixed(1)}%
            </span>
          )}
          <span className={cn(
            "text-sm font-semibold px-3 py-1 rounded-full",
            value < 50 ? "bg-rose-500/20 text-rose-400" : 
            value < 75 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
          )}>
            {riskText}
          </span>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center text-sm">
        <span className="text-slate-400">Prognostic Score</span>
        <span className="font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded font-bold">
          {prognosisScore.toFixed(3)}
        </span>
      </div>
    </div>
  );
};

export default PrognosisCard;
