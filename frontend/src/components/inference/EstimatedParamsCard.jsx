import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Info } from 'lucide-react';

const FEATURE_LABELS = {
  age:            'Age (years)',
  tumor_size:     'Tumor Size (mm)',
  lymph_nodes:    'Lymph Nodes',
  er_status:      'ER Status',
  pr_status:      'PR Status',
  her2_status:    'HER2 Status',
  grade:          'Histological Grade',
  ki67:           'KI67 (%)',
  tp53_mutation:  'TP53 Mutation',
  brca1_mutation: 'BRCA1 Mutation',
};

const BINARY_FEATURES = ['er_status', 'pr_status', 'her2_status', 'tp53_mutation', 'brca1_mutation'];

const formatValue = (key, val) => {
  if (BINARY_FEATURES.includes(key)) return val ? 'Positive' : 'Negative';
  if (key === 'ki67') return `${parseFloat(val).toFixed(1)}%`;
  if (key === 'tumor_size') return `${parseFloat(val).toFixed(1)} mm`;
  if (key === 'grade') return `Grade ${val}`;
  return String(val);
};

const ConfidencePill = ({ confidence, userProvided }) => {
  const pct = Math.round(confidence * 100);
  if (userProvided) {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
        ✓ Provided
      </span>
    );
  }
  const color = pct >= 65 ? 'blue' : pct >= 55 ? 'amber' : 'rose';
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-${color}-500/20 text-${color}-400 border border-${color}-500/20`}>
      ~{pct}% conf.
    </span>
  );
};

const EstimatedParamsCard = ({ estimatedClinicalData, patientMode }) => {
  const [expanded, setExpanded] = useState(false);

  if (!estimatedClinicalData) return null;

  const { values, confidence, method, data_completeness_score } = estimatedClinicalData;
  const completePct = Math.round(data_completeness_score * 100);
  const estimatedCount = Object.values(confidence).filter(c => c < 1.0).length;

  return (
    <div className="glass rounded-2xl border border-indigo-500/20 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-5 hover:bg-white/3 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4.5 h-4.5 text-indigo-400" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white">Clinical Parameter Analysis</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {patientMode
              ? `${estimatedCount} of 10 features AI-estimated from scan · ${completePct}% data completeness`
              : 'All 10 features provided by clinician · 100% data completeness'}
          </p>
        </div>

        {/* Completeness bar */}
        <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-xs font-bold text-indigo-300">{completePct}%</span>
          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${completePct}%`,
                background: completePct === 100
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #6366f1, #a855f7)',
              }}
            />
          </div>
        </div>

        {expanded ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-white/10">
          {/* Legend */}
          {patientMode && (
            <div className="px-5 py-3 bg-amber-500/5 border-b border-white/5 flex flex-wrap gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[11px] text-slate-400">User-provided (100% confidence)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span className="text-[11px] text-slate-400">AI-estimated from radiomic image features</span>
              </div>
            </div>
          )}

          {/* Parameter grid */}
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(FEATURE_LABELS).map(([key, label]) => {
              const val     = values[key];
              const conf    = confidence[key] ?? 0;
              const isUser  = conf >= 1.0;

              if (val === undefined && val === null) return null;

              return (
                <div
                  key={key}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                    isUser
                      ? 'bg-emerald-500/5 border-emerald-500/15'
                      : 'bg-white/3 border-white/8'
                  }`}
                >
                  <div>
                    <p className="text-xs font-medium text-slate-400">{label}</p>
                    <p className={`text-sm font-bold mt-0.5 ${isUser ? 'text-white' : 'text-indigo-300'}`}>
                      {formatValue(key, val)}
                    </p>
                  </div>
                  <ConfidencePill confidence={conf} userProvided={isUser} />
                </div>
              );
            })}
          </div>

          {/* Method note */}
          {patientMode && (
            <div className="px-5 pb-4 flex gap-2 items-start">
              <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Estimation method: <strong className="text-slate-400">Radiomics-conditioned cross-modal imputation</strong>.
                Features are predicted from image intensity, texture, edge patterns, and
                enhancement heterogeneity — not from population averages. Accuracy is lower
                than user-provided data; confidence intervals above reflect this.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EstimatedParamsCard;
