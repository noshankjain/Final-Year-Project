import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CasesTable from '../components/dashboard/CasesTable';
import { Search, Filter, Plus, RefreshCw } from 'lucide-react';
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

      const res = await api.get(`/api/cases?${params.toString()}`);
      // Backend returns: { success, count, total, totalPages, data: [...cases] }
      const { data, total: t, totalPages: tp } = res.data;
      setCases(Array.isArray(data) ? data : []);
      setTotal(t || 0);
      setTotalPages(tp || 1);
    } catch (err) {
      toast.error('Failed to load cases');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  // Client-side search & diagnosis filter on already-fetched page
  const filteredCases = cases.filter(c => {
    const matchesSearch = !searchTerm ||
      (c.patientUUID || '').toLowerCase().includes(searchTerm.toLowerCase());
    const diagnosis = c.inferenceResult?.diagnosis || null;
    const matchesDiagnosis = diagnosisFilter === 'all' || diagnosis === diagnosisFilter;
    return matchesSearch && matchesDiagnosis;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Case Directory</h1>
          <p className="text-slate-400 mt-1">
            {total > 0 ? `${total} total cases` : 'No cases yet'} — view and manage all patient analyses.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fetchCases(true)}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2 py-2 px-4 text-sm"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/cases/new')}
            className="btn-primary flex items-center gap-2 py-2 px-4 text-sm"
          >
            <Plus size={15} /> New Case
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass p-4 rounded-2xl flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by Patient UUID..."
            className="input-field pl-9 py-2 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
          <select
            className="input-field pl-9 py-2 text-sm appearance-none cursor-pointer pr-8"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s} className="bg-slate-800">
                {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Diagnosis filter */}
        <div className="relative">
          <select
            className="input-field py-2 text-sm appearance-none cursor-pointer pr-8 pl-3"
            value={diagnosisFilter}
            onChange={(e) => setDiagnosisFilter(e.target.value)}
          >
            {DIAGNOSIS_OPTIONS.map(d => (
              <option key={d} value={d} className="bg-slate-800">
                {d === 'all' ? 'All Diagnoses' : d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Clear filters */}
        {(searchTerm || statusFilter !== 'all' || diagnosisFilter !== 'all') && (
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter('all'); setDiagnosisFilter('all'); setPage(1); }}
            className="text-sm text-slate-400 hover:text-white transition-colors underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="h-64 glass flex items-center justify-center animate-pulse">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <CasesTable
          cases={filteredCases}
          onViewCase={(id) => navigate(`/cases/${id}/results`)}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-slate-400">
            Page {page} of {totalPages} · {total} cases total
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="btn-secondary py-2 px-4 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="btn-secondary py-2 px-4 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CasesListPage;
