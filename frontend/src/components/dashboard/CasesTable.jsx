import React from 'react';
import { truncateUUID, formatDate, formatPercent } from '../../utils/helpers';
import StatusBadge from '../shared/StatusBadge';
import { ChevronRight, FileSearch } from 'lucide-react';

const CasesTable = ({ cases = [], onViewCase }) => {
  if (!cases.length) {
    return (
      <div className="glass p-12 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
          <FileSearch className="w-10 h-10 text-slate-500" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No cases found</h3>
        <p className="text-slate-400 max-w-sm">
          Get started by uploading a new Whole Slide Image and clinical data for analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-white/10 bg-white/5">
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Patient UUID</th>
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Physician</th>
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Diagnosis</th>
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Confidence</th>
            <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {cases.map((c) => {
            // MongoDB uses _id; inference result may be nested or separate
            const caseId = c._id || c.id;
            const patientUUID = c.patientUUID || c.patientId || caseId;
            const diagnosis = c.inferenceResult?.diagnosis || c.diagnosis || null;
            const confidence = c.inferenceResult?.confidence || c.confidence || null;
            // Physician may be populated object or string
            const physicianName = c.physicianId?.name || c.physician || '—';

            return (
              <tr
                key={caseId}
                className="hover:bg-white/5 transition-colors group cursor-pointer"
                onClick={() => onViewCase && onViewCase(caseId)}
              >
                <td className="p-4">
                  <span className="font-mono text-sm text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded">
                    {truncateUUID(patientUUID)}
                  </span>
                </td>
                <td className="p-4 text-sm text-slate-300">{formatDate(c.createdAt)}</td>
                <td className="p-4 text-sm text-slate-300">{physicianName}</td>
                <td className="p-4"><StatusBadge status={c.status} /></td>
                <td className="p-4">
                  {diagnosis ? (
                    <span className={`font-semibold text-sm ${
                      diagnosis.toLowerCase() === 'malignant' ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {diagnosis.toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-slate-500 text-sm">—</span>
                  )}
                </td>
                <td className="p-4 text-sm font-medium text-slate-300">
                  {confidence != null ? formatPercent(confidence) : '—'}
                </td>
                <td className="p-4 text-right">
                  <button
                    className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); onViewCase && onViewCase(caseId); }}
                  >
                    <ChevronRight size={18} />
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
