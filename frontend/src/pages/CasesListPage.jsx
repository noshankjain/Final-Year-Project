import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CasesTable from '../components/dashboard/CasesTable';
import { MagnifyingGlass, Funnel, Plus, ArrowClockwise } from '@phosphor-icons/react';
import api from '../services/api';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['all', 'pending', 'processing', 'complete', 'failed'];
const DIAGNOSIS_OPTIONS = ['all', 'benign', 'malignant'];

const CasesListPage = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [diagnosisFilter, setDiagnosisFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  const fetchCases = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const res = await api.get(`/api/cases?${params}`);
      const { data, total: t, totalPages: tp } = res.data;
      setCases(Array.isArray(data) ? data : []);
      setTotal(t || 0);
      setTotalPages(tp || 1);
    } catch {
      toast.error('Failed to load cases');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const filteredCases = cases.filter(c => {
    const matchSearch = !searchTerm || (c.patientUUID || '').toLowerCase().includes(searchTerm.toLowerCase());
    const diag = c.inferenceResult?.diagnosis || null;
    const matchDiag = diagnosisFilter === 'all' || diag === diagnosisFilter;
    return matchSearch && matchDiag;
  });

  const hasFilters = searchTerm || statusFilter !== 'all' || diagnosisFilter !== 'all';

  return (
    <div className="space-y-6 pb-10 animate-fade-up">
      {/* Header — no em-dash (§9.G), plain language */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Case Directory
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {total > 0 ? `${total} total cases` : 'No cases yet'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => fetchCases(true)}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            <ArrowClockwise size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/cases/new')}
            className="btn-primary flex items-center gap-2"
            style={{ padding: '8px 14px', fontSize: '13px' }}
            id="cases-new-case"
          >
            <Plus size={14} weight="bold" />
            New Case
          </button>
        </div>
      </div>

      {/* Filters — clean row, no eyebrow label above it */}
      <div className="surface p-3 flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <MagnifyingGlass
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <input
            type="text"
            placeholder="Search by Patient ID"
            className="input-field pl-8"
            style={{ padding: '8px 12px 8px 32px', fontSize: '13px' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            id="cases-search"
          />
        </div>

        {/* Status */}
        <select
          className="input-field"
          style={{ padding: '8px 12px', fontSize: '13px', width: 'auto', cursor: 'pointer' }}
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          id="cases-status-filter"
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s} style={{ background: 'var(--surface-overlay)' }}>
              {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        {/* Diagnosis */}
        <select
          className="input-field"
          style={{ padding: '8px 12px', fontSize: '13px', width: 'auto', cursor: 'pointer' }}
          value={diagnosisFilter}
          onChange={e => setDiagnosisFilter(e.target.value)}
          id="cases-diagnosis-filter"
        >
          {DIAGNOSIS_OPTIONS.map(d => (
            <option key={d} value={d} style={{ background: 'var(--surface-overlay)' }}>
              {d === 'all' ? 'All Diagnoses' : d.charAt(0).toUpperCase() + d.slice(1)}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter('all'); setDiagnosisFilter('all'); setPage(1); }}
            className="text-xs transition-colors"
            style={{ color: 'var(--text-tertiary)', textDecoration: 'underline' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Table or skeleton */}
      {loading ? (
        <div className="surface p-6 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton h-12 w-full" />
          ))}
        </div>
      ) : (
        <CasesTable cases={filteredCases} onViewCase={id => navigate(`/cases/${id}/results`)} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Page {page} of {totalPages} ({total} cases)
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="btn-secondary"
              style={{ padding: '7px 14px', fontSize: '13px' }}
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="btn-secondary"
              style={{ padding: '7px 14px', fontSize: '13px' }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CasesListPage;
