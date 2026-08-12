import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { formatFeatureName } from '../../utils/helpers';

// SHAPChart — no uppercase tracking eyebrow, clean tooltip, Phosphor not used here
// (recharts manages its own rendering context)
const SHAPChart = ({ shapValues = {} }) => {
  const data = Object.entries(shapValues)
    .map(([key, value]) => ({
      feature: formatFeatureName(key),
      value:   Number(value),
      abs:     Math.abs(Number(value)),
    }))
    .sort((a, b) => b.abs - a.abs)
    .slice(0, 8);

  if (data.length === 0) {
    return (
      <div className="surface-elevated h-full flex flex-col items-center justify-center p-6">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          No SHAP data available for this case.
        </p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const positive = d.value > 0;
    return (
      <div
        className="p-3 rounded-lg text-sm shadow-xl"
        style={{
          background: 'var(--surface-overlay)',
          border:     '1px solid var(--surface-border-hi)',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{d.feature}</p>
        <p style={{ color: positive ? '#f43f5e' : '#10b981' }}>
          {d.value > 0 ? '+' : ''}{d.value.toFixed(4)}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {positive ? 'Raises malignancy probability' : 'Lowers malignancy probability'}
        </p>
      </div>
    );
  };

  return (
    <div className="surface-elevated h-full flex flex-col p-6">
      {/* No uppercase tracking eyebrow on every card (§4.7 — max 1 per 3 sections) */}
      <p className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
        Feature contributions (SHAP)
      </p>

      <div className="flex-1 w-full min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 2, right: 16, left: 4, bottom: 2 }}
          >
            <XAxis type="number" hide />
            <YAxis
              dataKey="feature"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: "'Outfit', sans-serif" }}
              width={94}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              content={<CustomTooltip />}
            />
            <ReferenceLine x={0} stroke="var(--surface-border-hi)" />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.value > 0 ? '#f43f5e' : '#10b981'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend — plain, no colored status dots (§9.F) */}
      <div
        className="flex items-center justify-center gap-6 mt-4 pt-4 text-xs"
        style={{ borderTop: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#10b981' }} />
          <span>Toward benign</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#f43f5e' }} />
          <span>Toward malignant</span>
        </div>
      </div>
    </div>
  );
};

export default SHAPChart;
