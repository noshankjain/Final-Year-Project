import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { Heartbeat } from '@phosphor-icons/react';

const PrognosisCard = ({ survivalProbability, prognosisScore }) => {
  const value = (survivalProbability ?? 0) * 100;

  let color    = '#10b981';
  let riskText = 'Low risk';
  if (value < 50) {
    color    = '#f43f5e';
    riskText = 'High risk';
  } else if (value < 75) {
    color    = '#f59e0b';
    riskText = 'Moderate risk';
  }

  const data = [{ name: 'Survival', value, fill: color }];

  return (
    <div className="surface-elevated h-full flex flex-col p-6">
      {/* Section label — only used once, satisfies max-1-per-3 rule in context */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          5-Year Survival Probability
        </p>
        <Heartbeat size={16} style={{ color: 'var(--text-tertiary)' }} />
      </div>

      {/* Semicircle gauge */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-full h-44 relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              cx="50%" cy="100%"
              innerRadius="78%"
              outerRadius="100%"
              barSize={18}
              data={data}
              startAngle={180}
              endAngle={0}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar
                minAngle={15}
                background={{ fill: 'rgba(255,255,255,0.05)' }}
                clockWise
                dataKey="value"
                cornerRadius={10}
                animationDuration={1200}
              />
            </RadialBarChart>
          </ResponsiveContainer>

          {/* Value overlay */}
          <div className="absolute bottom-0 inset-x-0 flex flex-col items-center">
            <span className="font-mono text-3xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {value.toFixed(1)}%
            </span>
            <span
              className="text-xs font-medium mt-1 px-2.5 py-0.5 rounded-md"
              style={{ background: `${color}18`, color, border: `1px solid ${color}28` }}
            >
              {riskText}
            </span>
          </div>
        </div>
      </div>

      {/* Prognostic score — mono, no gradient badge */}
      <div
        className="mt-4 pt-4 flex justify-between items-center text-sm"
        style={{ borderTop: '1px solid var(--surface-border)' }}
      >
        <span style={{ color: 'var(--text-secondary)' }}>Prognostic score</span>
        <span
          className="font-mono text-sm px-2 py-0.5 rounded-md"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
        >
          {(prognosisScore ?? 0).toFixed(3)}
        </span>
      </div>
    </div>
  );
};

export default PrognosisCard;
