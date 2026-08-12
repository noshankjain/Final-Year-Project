import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ShieldWarning, ShieldCheck } from '@phosphor-icons/react';

// DiagnosisCard — no "uppercase tracking-wider" eyebrow on every card (§4.7)
// Shape lock: rounded-lg (16px) throughout (§4.4)
// Color lock: rose = malignant, emerald = benign (§4.2)
const DiagnosisCard = ({ diagnosis, confidence, confidenceLower, confidenceUpper }) => {
  const isMalignant = diagnosis?.toLowerCase() === 'malignant';
  const color       = isMalignant ? '#f43f5e' : '#10b981';
  const Icon        = isMalignant ? ShieldWarning : ShieldCheck;
  const pct         = ((confidence ?? 0) * 100).toFixed(1);
  const lo          = confidenceLower != null ? (confidenceLower * 100).toFixed(0) : null;
  const hi          = confidenceUpper != null ? (confidenceUpper * 100).toFixed(0) : null;

  const data = [
    { value: confidence * 100 },
    { value: 100 - confidence * 100 },
  ];

  return (
    <div className="surface-elevated h-full flex flex-col items-center justify-center p-6 gap-5">
      {/* Donut chart */}
      <div className="relative w-40 h-40 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={70}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={1200}
            >
              <Cell fill={color} />
              <Cell fill="rgba(255,255,255,0.06)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {pct}%
          </span>
          <span className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            confidence
          </span>
        </div>
      </div>

      {/* Diagnosis label — no uppercase tracking eyebrow above */}
      <div
        className="flex items-center gap-2.5 px-5 py-2.5 rounded-lg"
        style={{
          background: `${color}18`,
          border:     `1px solid ${color}30`,
        }}
      >
        <Icon size={20} weight="regular" style={{ color }} />
        <span className="font-semibold text-lg capitalize" style={{ color }}>
          {diagnosis}
        </span>
      </div>

      {/* Confidence interval — plain text, no bar with background track (§9.F) */}
      {lo != null && hi != null && (
        <p className="text-xs text-center font-mono" style={{ color: 'var(--text-secondary)' }}>
          95% CI: {lo}% - {hi}%
        </p>
      )}
    </div>
  );
};

export default DiagnosisCard;
