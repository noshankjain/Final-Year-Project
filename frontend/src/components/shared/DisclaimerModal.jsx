import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, X, FileWarning } from 'lucide-react';

const DisclaimerModal = ({ onAccept, onDecline }) => {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onDecline} />

      {/* Modal */}
      <div className="relative w-full max-w-lg glass rounded-2xl border border-amber-500/30 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <FileWarning className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Important Medical Disclaimer</h2>
            <p className="text-xs text-slate-400 mt-0.5">Please read before continuing</p>
          </div>
          <button
            onClick={onDecline}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Warning items */}
          {[
            {
              icon: AlertTriangle,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10',
              title: 'This is NOT a Medical Diagnosis',
              text: 'This tool provides an AI-generated screening score only. It cannot replace a qualified physician, radiologist, or oncologist.',
            },
            {
              icon: ShieldCheck,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
              title: 'Research & Educational Use Only',
              text: 'This system is a Final Year Research Project. Results are for academic demonstration and must not be used for real clinical decisions.',
            },
            {
              icon: AlertTriangle,
              color: 'text-rose-400',
              bg: 'bg-rose-500/10',
              title: 'Always Consult a Doctor',
              text: 'If you have any health concerns, please consult a certified healthcare professional immediately. Do not delay medical care based on this result.',
            },
          ].map(({ icon: Icon, color, bg, title, text }) => (
            <div key={title} className={`flex gap-3 p-3 rounded-xl ${bg} border border-white/5`}>
              <Icon className={`w-5 h-5 ${color} flex-shrink-0 mt-0.5`} />
              <div>
                <p className={`text-sm font-semibold ${color}`}>{title}</p>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{text}</p>
              </div>
            </div>
          ))}

          {/* Consent checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group mt-2">
            <div
              className={`w-5 h-5 rounded flex-shrink-0 mt-0.5 border-2 flex items-center justify-center transition-all duration-200 ${
                checked
                  ? 'bg-indigo-500 border-indigo-500'
                  : 'border-slate-500 bg-transparent group-hover:border-indigo-400'
              }`}
              onClick={() => setChecked(c => !c)}
            >
              {checked && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => setChecked(e.target.checked)} />
            <span className="text-sm text-slate-300 leading-relaxed">
              I understand that this tool is{' '}
              <span className="text-amber-400 font-semibold">for research purposes only</span>,
              is not a substitute for professional medical advice, and I will consult a
              qualified doctor for any health concerns.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onDecline}
            className="btn-secondary flex-1 py-2.5"
          >
            Cancel
          </button>
          <button
            onClick={onAccept}
            disabled={!checked}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
              checked
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            I Understand — Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerModal;
