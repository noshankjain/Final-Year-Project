import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StatsCard from '../components/dashboard/StatsCard';
import CasesTable from '../components/dashboard/CasesTable';
import { Users, Activity, FileCheck2, Clock, Plus } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await api.get('/api/cases?limit=100');
        // Backend listCases returns: { success, count, total, data: [...cases] }
        setCases(Array.isArray(res.data.data) ? res.data.data : []);
      } catch (err) {
        toast.error('Failed to load cases');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  const completeCases = cases.filter(c => c.status === 'complete');
  const malignantCount = completeCases.filter(c => c.inferenceResult?.diagnosis === 'malignant').length;
  const malignantRate = completeCases.length
    ? Math.round((malignantCount / completeCases.length) * 100)
    : 0;
  const pendingCount = cases.filter(c => c.status === 'pending' || c.status === 'processing').length;
  const avgSurvival = completeCases.length
    ? Math.round(
        (completeCases.reduce((sum, c) => sum + (c.inferenceResult?.survivalProbability || 0), 0) / completeCases.length) * 100
      )
    : 0;

  return (
    <div className="space-y-6 animate-fade-in relative pb-20">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Welcome back, {user?.name} 👋
        </h1>
        <p className="text-slate-400 mt-1">
          Here's an overview of your recent cases and AI diagnostics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Total Cases" value={loading ? '—' : cases.length} icon={Users} color="indigo" trend={12} />
        <StatsCard title="Pending Analysis" value={loading ? '—' : pendingCount} icon={Clock} color="amber" />
        <StatsCard title="Malignant Rate" value={loading ? '—' : `${malignantRate}%`} icon={Activity} color="rose" trend={-2.4} />
        <StatsCard title="Avg Survival Prob." value={loading ? '—' : `${avgSurvival}%`} icon={FileCheck2} color="emerald" />
      </div>

      <div className="mt-8">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Recent Cases</h2>
            <p className="text-sm text-slate-400">Latest analysis results and pending WSI scans.</p>
          </div>
          <button onClick={() => navigate('/cases')} className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
            View all →
          </button>
        </div>

        {loading ? (
          <div className="h-64 glass flex items-center justify-center animate-pulse">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <CasesTable
            cases={cases.slice(0, 10)}
            onViewCase={(id) => navigate(`/cases/${id}/results`)}
          />
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => navigate('/cases/new')}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white hover:scale-110 transition-transform z-40 group animate-pulse-glow"
        title="New Case"
      >
        <Plus size={32} className="group-hover:rotate-90 transition-transform duration-300" />
      </button>
    </div>
  );
};

export default DashboardPage;
