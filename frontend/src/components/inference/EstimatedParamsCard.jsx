import React, { useState } from 'react';
import { Sparkle, CaretDown, CaretUp, Info } from '@phosphor-icons/react';

const FEATURE_LABELS = {
  age:            'Age',
  tumor_size:     'Tumor Size',
  lymph_nodes:    'Lymph Nodes',
  er_status:      'ER Status',
  pr_status:      'PR Status',
  her2_status:    'HER2 Status',
  grade:          'Grade',
  ki67:           'KI67',
  tp53_mutation:  'TP53',
  brca1_mutation: 'BRCA1',
};

const BINARY = ['er_status', 'pr_status', 'her2_status', 'tp53_mutation', 'brca1_mutation'];

const fmtValue = (key, val) => {
  if (BINARY.includes(key))     return val ? 'Positive' : 'Negative';
  if (key === 'ki67')           return `${parseFloat(val).toFixed(1)}%`;
  if (key === 'tumor_size')     return `${parseFloat(val).toFixed(1)} mm`;
  if (key === 'grade')          return `Grade ${val}`;
  return String(val);
};

// Confidence pill — no status dot (§9.F), text only
const ConfPill = ({ conf, userProvided }) => {
  if (userProvided) {
    return (
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
        style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
        Provided
      </span>
    );
  }
  const pct = Math.round(conf * 100);
  const [bg, fg] = pct >= 65
    ? ['rgba(0,212,180,0.12)', 'var(--accent)']
    : pct >= 55
    ? ['rgba(245,158,11,0.12)', '#f59e0b']
    : ['rgba(244,63,94,0.12)', '#f43f5e'];
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
      style={{ background: bg, color: fg, border: `1px solid ${bg.replace('0.12', '0.22')}` }}>
      ~{pct}%
    </span>
  );
};

const EstimatedParamsCard = ({ estimatedClinicalData, patientMode }) => {
  const [expanded, setExpanded] = useState(false);
  if (!estimatedClinicalData) return null;

  const { values, confidence, data_completeness_score } = estimatedClinicalData;
  const completePct    = Math.round((data_completeness_score ?? 1) * 100);
  const estimatedCount = Object.values(confidence).filter(c => c < 1.0).length;

  return (
    <div className="surface" style={{ border: '1px solid var(--surface-border-hi)' }}>
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 text-left transition-colors"
        style={{ borderRadius: 'var(--radius-lg)' }}
        aria-expanded={expanded}
        id="estimated-params-toggle"
      >
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent-dim)' }}
        >
          <Sparkle size={16} style={{ color: 'var(--accent)' }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Clinical parameters
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {patientMode
              ? `${estimatedCount} of 10 AI-estimated from image, ${10 - estimatedCount} user-provided`
              : 'All 10 parameters provided by clinician'}
          </p>
        </div>

        {/* Completeness — plain percentage, no filled bar track (§9.F) */}
        <span className="font-mono text-sm font-semibold flex-shrink-0" style={{ color: 'var(--accent)' }}>
          {completePct}%
        </span>

        {expanded
          ? <CaretUp size={14} style={{ color: 'var(--text-secondary)' }} className="flex-shrink-0" />
          : <CaretDown size={14} style={{ color: 'var(--text-secondary)' }} className="flex-shrink-0" />
        }
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--surface-border)' }}>
          {/* Parameter grid — 2 cols on sm+ */}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(FEATURE_LABELS).map(([key, label]) => {
              const val    = values?.[key];
              const conf   = confidence?.[key] ?? 0;
              const isUser = conf >= 1.0;
              if (val === undefined || val === null) return null;

              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{
                    background: isUser ? 'rgba(16,185,129,0.06)' : 'var(--surface-base)',
                    border:     `1px solid ${isUser ? 'rgba(16,185,129,0.15)' : 'var(--surface-border)'}`,
                  }}
                >
                  <div>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                    <p
                      className="text-sm font-semibold font-mono mt-0.5"
                      style={{ color: isUser ? 'var(--text-primary)' : 'var(--accent)' }}
                    >
                      {fmtValue(key, val)}
                    </p>
                  </div>
                  <ConfPill conf={conf} userProvided={isUser} />
                </div>
              );
            })}
          </div>

          {/* Method note — plain, not marketing copy (§9.D) */}
          {patientMode && (
            <div
              className="px-4 pb-4 flex gap-2 items-start"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <Info size={13} className="flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                AI-estimated parameters use radiomics features extracted from the image patch:
                intensity statistics, GLCM texture, edge density, and colour channels.
                Accuracy is lower than user-provided data. Confidence values above reflect estimation uncertainty.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EstimatedParamsCard;
