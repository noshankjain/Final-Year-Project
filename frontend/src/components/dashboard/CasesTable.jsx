import React from 'react';
import { truncateUUID, formatDate, formatPercent } from '../../utils/helpers';
import StatusBadge from '../shared/StatusBadge';
import { ArrowRight, MagnifyingGlass } from '@phosphor-icons/react';

// CasesTable — no "uppercase tracking-wider" on every column header (§4.7)
// Table row hover uses surface-overlay, not white/5 (§4.11 page theme lock)
// Empty state: descriptive, no generic "egg" avatar (§9.D)
const CasesTable = ({ cases = [], onViewCase }) => {
  if (!cases.length) {
    return (
      <div className="surface p-12 flex flex-col items-center justify-center text-center">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--surface-border-hi)' }}
        >
          <MagnifyingGlass size={28} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          No cases found
        </p>
        <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>
          Submit a histopathology image to start an analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="surface overflow-x-auto">
      <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
        <thead>
          {/* Column headers — smaller text, no uppercase tracking on every column */}
          <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
            {['Patient ID', 'Date', 'Physician', 'Status', 'Diagnosis', 'Confidence', ''].map(col => (
              <th
                key={col}
                className="px-4 py-3 text-xs font-medium"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cases.map(c => {
            const caseId        = c._id || c.id;
            const patientUUID   = c.patientUUID || c.patientId || caseId;
            const diagnosis     = c.inferenceResult?.diagnosis || c.diagnosis || null;
            const confidence    = c.inferenceResult?.confidence ?? c.confidence ?? null;
            const physicianName = c.physicianId?.name || c.physician || 'Unknown';

            return (
              <tr
                key={caseId}
                className="group cursor-pointer transition-colors"
                style={{ borderBottom: '1px solid var(--surface-border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-overlay)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => onViewCase && onViewCase(caseId)}
              >
                {/* Patient ID — mono, teal tint */}
                <td className="px-4 py-3">
                  <span
                    className="font-mono text-xs px-2 py-1 rounded-md"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                  >
                    {truncateUUID(patientUUID)}
                  </span>
                </td>

                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(c.createdAt)}
                </td>

                <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {physicianName}
                </td>

                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>

                <td className="px-4 py-3">
                  {diagnosis ? (
                    <span
                      className="text-sm font-semibold capitalize"
                      style={{ color: diagnosis.toLowerCase() === 'malignant' ? '#f43f5e' : '#10b981' }}
                    >
                      {diagnosis}
                    </span>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>-</span>
                  )}
                </td>

                <td className="px-4 py-3 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {confidence != null ? formatPercent(confidence) : '-'}
                </td>

                {/* Action — appears on row hover */}
                <td className="px-4 py-3 text-right">
                  <button
                    className="w-7 h-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
                    onClick={e => { e.stopPropagation(); onViewCase && onViewCase(caseId); }}
                    aria-label="View case"
                  >
                    <ArrowRight size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CasesTable;
