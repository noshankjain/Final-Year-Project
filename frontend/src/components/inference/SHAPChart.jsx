import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { formatFeatureName } from '../../utils/helpers';
import { BarChart2 } from 'lucide-react';

const SHAPChart = ({ shapValues = {} }) => {
  
  // Transform and sort data
  const data = Object.entries(shapValues)
    .map(([key, value]) => ({
      feature: formatFeatureName(key),
      rawKey: key,
      value: Number(value),
      abs: Math.abs(Number(value))
    }))
    .sort((a, b) => b.abs - a.abs)
    .slice(0, 8); // Top 8 features

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPositive = data.value > 0;
      return (
        <div className="glass p-3 border-white/20 text-sm">
          <p className="font-semibold text-white mb-1">{data.feature}</p>
          <p className={isPositive ? 'text-rose-400' : 'text-emerald-400'}>
            SHAP Value: {data.value > 0 ? '+' : ''}{data.value.toFixed(4)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {isPositive ? 'Increases malignancy risk' : 'Decreases malignancy risk'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card h-full flex flex-col">
      <h3 className="text-slate-400 font-medium mb-6 uppercase tracking-wider text-sm flex items-center gap-2">
        <BarChart2 size={16} />
        <span>Feature Contributions (SHAP)</span>
      </h3>
      
      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis 
              dataKey="feature" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              width={100}
            />
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip />} />
            <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#f43f5e' : '#10b981'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/10 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500"></div>
          <span>Pushes toward Benign</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-rose-500"></div>
          <span>Pushes toward Malignant</span>
        </div>
      </div>
    </div>
  );
};

export default SHAPChart;
