import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DiagnosisCard from '../components/inference/DiagnosisCard';
import PrognosisCard from '../components/inference/PrognosisCard';
import GradCAMViewer from '../components/inference/GradCAMViewer';
import SHAPChart from '../components/inference/SHAPChart';
import EstimatedParamsCard from '../components/inference/EstimatedParamsCard';
import LoadingOverlay from '../components/shared/LoadingOverlay';
import StatusBadge from '../components/shared/StatusBadge';
import {
  ChevronLeft, Download, FileText, User, RefreshCw,
  AlertTriangle, Stethoscope, Sparkles, ShieldAlert, Info
} from 'lucide-react';
import { truncateUUID, formatDate } from '../utils/helpers';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── Confidence interval bar ──────────────────────────────────────────────────
const ConfidenceIntervalBar = ({ confidence, lower, upper, patientMode }) => {
  const pct = Math.round(confidence * 100);
  const lPct = Math.round(lower * 100);
  const uPct = Math.round(upper * 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400">Confidence</span>
        <span className="font-bold text-white">{pct}%</span>
      </div>
      {/* Bar */}
      <div className="relative h-3 bg-white/10 rounded-full overflow-visible">
        {/* CI range shading */}
        <div
          className="absolute top-0 h-full rounded-full opacity-30"
          style={{
            left: `${lPct}%`,
            width: `${uPct - lPct}%`,
            background: 'linear-gradient(90deg, #6366f1, #a855f7)',
          }}
        />
        {/* Point estimate */}
        <div
          className="absolute top-0 h-full w-1 bg-white rounded-full shadow-lg"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>{lPct}% (lower bound)</span>
        {patientMode && <span className="text-amber-400">Wider CI — estimated parameters</span>}
        <span>{uPct}% (upper bound)</span>
      </div>
    </div>
  );
};

// ─── Early Warning Score card (for patient mode) ──────────────────────────────
const EarlyWarningCard = ({ diagnosis, confidence, lower, upper }) => {
  const isMal    = diagnosis?.toLowerCase() === 'malignant';
  const pct      = Math.round(confidence * 100);
  const lPct     = Math.round(lower * 100);
  const uPct     = Math.round(upper * 100);

  // Map to a 1-5 risk score
  let score, label, color, desc;
  if (pct < 40)        { score = 1; label = 'Very Low Risk'; color = 'emerald'; desc = 'Screening suggests low concern. Routine check-up recommended.'; }
  else if (pct < 55)   { score = 2; label = 'Low-Moderate Risk'; color = 'lime';    desc = 'Some indicators present. Follow-up screening advised.'; }
  else if (pct < 70)   { score = 3; label = 'Moderate Risk'; color = 'amber';   desc = 'Notable indicators detected. Prompt consultation recommended.'; }
  else if (pct < 85)   { score = 4; label = 'High Risk'; color = 'orange';  desc = 'Significant indicators detected. Urgent medical consultation required.'; }
  else                  { score = 5; label = 'Very High Risk'; color = 'rose';    desc = 'Strong indicators of concern. Seek immediate medical attention.'; }

  return (
    <div className={`glass rounded-2xl p-6 border border-${color}-500/30 bg-${color}-500/5`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
            Early Warning Score
          </p>
          <h2 className={`text-2xl font-bold text-${color}-400`}>{label}</h2>
        </div>
        <div className={`w-14 h-14 rounded-xl bg-${color}-500/20 flex flex-col items-center justify-center border border-${color}-500/30`}>
          <span className={`text-2xl font-black text-${color}-400`}>{score}</span>
          <span className="text-[9px] text-slate-400 font-medium">/ 5</span>
        </div>
      </div>

      {/* Score dots */}
      <div className="flex gap-2 mb-4">
        {[1,2,3,4,5].map(i => (
          <div
            key={i}
            className={`flex-1 h-2 rounded-full transition-all ${
              i <= score ? `bg-${color}-500` : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      <p className="text-sm text-slate-300 leading-relaxed mb-4">{desc}</p>

      <ConfidenceIntervalBar
        confidence={confidence}
        lower={lower}
        upper={upper}
        patientMode={true}
      />

      <p className="mt-3 text-[11px] text-slate-500">
        Range: {lPct}%–{uPct}% (wider because clinical data was AI-estimated)
      </p>
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const InferenceResultPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [analyzing,setAnalyzing]= useState(false);
  const [error,    setError]    = useState(null);

  const fetchCase = useCallback(async () => {
    try {
      const res  = await api.get(`/api/cases/${id}`);
      const flat = res.data.data;
      const { inferenceResult, ...caseFields } = flat;
      setCaseData(caseFields);
      setResult(inferenceResult || null);
      return caseFields.status !== 'processing'; // true = done polling
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load case');
      return true;
    }
  }, [id]);

  useEffect(() => {
    let interval = null;
    const init = async () => {
      setLoading(true);
      const done = await fetchCase();
      setLoading(false);
      if (!done) {
        interval = setInterval(async () => {
          const finished = await fetchCase();
          if (finished) clearInterval(interval);
        }, 3000);
      }
    };
    init();
    return () => { if (interval) clearInterval(interval); };
  }, [fetchCase]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await api.post(`/api/cases/${id}/analyze`);
      toast.success('Analysis started!');
      const interval = setInterval(async () => {
        const done = await fetchCase();
        if (done) { clearInterval(interval); setAnalyzing(false); }
      }, 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start analysis');
      setAnalyzing(false);
    }
  };

  const handleDownload = () => {
    window.print();
    toast.success('Report sent to printer / save as PDF');
  };

  if (loading)   return <LoadingOverlay message="Loading case data..." />;
  if (analyzing) return <LoadingOverlay message="AI is analysing your scan... This may take a moment." />;
  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <AlertTriangle className="w-16 h-16 text-rose-400" />
      <h2 className="text-xl font-semibold text-white">Error Loading Case</h2>
      <p className="text-slate-400">{error}</p>
      <button onClick={() => navigate('/cases')} className="btn-secondary">← Back to Cases</button>
    </div>
  );

  const isProcessing = caseData?.status === 'processing';
  const isFailed     = caseData?.status === 'failed';
  const isPending    = caseData?.status === 'pending';
  const isComplete   = caseData?.status === 'complete';

  // Detect patient mode from result (Mongoose returns camelCase field names)
  const patientMode = result?.patientMode === true;
  const estData     = result?.estimatedClinicalData || null;
  const confLower   = result?.confidenceLower ?? (result?.confidence ? result.confidence - 0.05 : 0);
  const confUpper   = result?.confidenceUpper ?? (result?.confidence ? result.confidence + 0.05 : 1);

  return (
    <div className="space-y-6 animate-fade-in pb-20 print:bg-white print:text-black">

      {/* ── RESEARCH WATERMARK (print-only) ─────────────────────────────── */}
      <div className="hidden print:flex items-center justify-center py-3 mb-4 border-2 border-red-600 rounded-lg">
        <p className="text-red-600 font-black text-lg text-center tracking-widest uppercase">
          ⚠ FOR RESEARCH USE ONLY — NOT A MEDICAL DIAGNOSIS ⚠
        </p>
      </div>

      {/* ── ETHICAL DISCLAIMER BANNER ────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 print:hidden">
        <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-300">Research Screening Tool — Not a Medical Diagnosis</p>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            This AI result is for research and educational purposes only. It must{' '}
            <strong className="text-amber-400">not</strong> replace consultation with a qualified
            oncologist, radiologist, or physician. If you have health concerns, please seek
            immediate professional medical advice.
          </p>
        </div>
      </div>

      {/* ── PATIENT MODE BANNER ──────────────────────────────────────────── */}
      {patientMode && isComplete && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-indigo-300">Patient Mode — AI-Estimated Clinical Profile</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Clinical parameters were estimated from your scan using radiomics analysis.
              Results show an <strong className="text-white">Early Warning Score</strong> with wider
              confidence intervals to reflect this uncertainty. Expand the clinical panel below
              to see what was estimated and each feature's confidence level.
            </p>
          </div>
        </div>
      )}

      {/* ── PAGE HEADER ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button
            onClick={() => navigate('/cases')}
            className="flex items-center gap-1 text-slate-400 hover:text-white text-sm mb-2 transition-colors print:hidden"
          >
            <ChevronLeft size={16} /> Back to Cases
          </button>
          <h1 className="text-2xl font-bold text-white tracking-tight flex flex-wrap items-center gap-3">
            {patientMode ? 'Screening Report' : 'Analysis Report'}
            <span className="text-sm font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
              {truncateUUID(caseData?.patientUUID)}
            </span>
            <StatusBadge status={caseData?.status} />
            {patientMode && (
              <span className="text-xs font-semibold text-indigo-300 bg-indigo-500/15 px-2 py-1 rounded-full border border-indigo-500/20 flex items-center gap-1">
                <Sparkles size={10} /> Patient Mode
              </span>
            )}
          </h1>
        </div>

        <div className="flex gap-3 print:hidden">
          {(isPending || isFailed) && (
            <button onClick={handleAnalyze} className="btn-primary flex items-center gap-2">
              <RefreshCw size={16} /> Run Analysis
            </button>
          )}
          {isComplete && (
            <button onClick={handleDownload} className="btn-secondary flex items-center gap-2">
              <Download size={18} /> Save Report
            </button>
          )}
        </div>
      </div>

      {/* ── PATIENT META ─────────────────────────────────────────────────── */}
      <div className="glass p-4 rounded-xl flex flex-wrap gap-6 text-sm">
        <div className="flex items-center gap-2 text-slate-300">
          <User size={16} className="text-slate-500" />
          <span className="text-slate-400">Patient UUID:</span>
          <span className="font-mono font-medium text-white">{caseData?.patientUUID}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300">
          <FileText size={16} className="text-slate-500" />
          <span className="text-slate-400">Date:</span>
          <span className="font-medium text-white">{formatDate(caseData?.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          {patientMode
            ? <span className="flex items-center gap-1 text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20"><Sparkles size={10} /> Patient Mode</span>
            : <span className="flex items-center gap-1 text-xs text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20"><Stethoscope size={10} /> Clinician Mode</span>
          }
        </div>
      </div>

      {/* ── PROCESSING STATE ─────────────────────────────────────────────── */}
      {isProcessing && (
        <div className="glass p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white font-semibold text-lg">AI Model is Analysing...</p>
          <p className="text-slate-400 text-sm">
            {patientMode
              ? 'Extracting radiomic features, estimating clinical profile, running diagnostic model...'
              : 'Running multimodal fusion through ResNet50 + MLP + Cross-Attention layers...'}
          </p>
          <p className="text-slate-500 text-xs">This page updates automatically.</p>
        </div>
      )}

      {/* ── FAILED STATE ─────────────────────────────────────────────────── */}
      {isFailed && (
        <div className="glass p-8 flex flex-col items-center gap-4 text-center border border-rose-500/20">
          <AlertTriangle className="w-12 h-12 text-rose-400" />
          <p className="text-white font-semibold text-lg">Analysis Failed</p>
          <p className="text-slate-400 text-sm">The ML service encountered an error. Please retry.</p>
          <button onClick={handleAnalyze} className="btn-primary mt-2">Retry Analysis</button>
        </div>
      )}

      {/* ── PENDING STATE ────────────────────────────────────────────────── */}
      {isPending && (
        <div className="glass p-8 flex flex-col items-center gap-4 text-center border border-amber-500/20">
          <RefreshCw className="w-10 h-10 text-amber-400" />
          <p className="text-white font-semibold text-lg">Analysis Not Started</p>
          <p className="text-slate-400 text-sm">Click "Run Analysis" to begin the AI diagnostic pipeline.</p>
        </div>
      )}

      {/* ── COMPLETE — RESULTS ───────────────────────────────────────────── */}
      {isComplete && result && (
        <div className="space-y-6">

          {/* Row 1: Diagnosis/Warning + Prognosis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {patientMode ? (
              <EarlyWarningCard
                diagnosis={result.diagnosis}
                confidence={result.confidence}
                lower={confLower}
                upper={confUpper}
              />
            ) : (
              <div className="space-y-4">
                <DiagnosisCard diagnosis={result.diagnosis} confidence={result.confidence} />
                <ConfidenceIntervalBar
                  confidence={result.confidence}
                  lower={confLower}
                  upper={confUpper}
                  patientMode={false}
                />
              </div>
            )}
            <PrognosisCard
              survivalProbability={result.survivalProbability}
              prognosisScore={result.prognosisScore}
            />
          </div>

          {/* Row 2: Estimated Clinical Params Card */}
          <EstimatedParamsCard
            estimatedClinicalData={estData}
            patientMode={patientMode}
          />

          {/* Row 3: GradCAM + SHAP */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GradCAMViewer
              originalImagePath={
                caseData?.wsiFilePath
                  ? `http://localhost:5000/uploads/${caseData.wsiFilePath.split('/').pop()}`
                  : null
              }
              gradcamImagePath={
                result.gradcamImagePath
                  ? `http://localhost:8000${result.gradcamImagePath}`
                  : null
              }
            />
            <SHAPChart shapValues={result.shapValues} />
          </div>

          {/* Row 4: Metadata + Watermark */}
          <div className="glass p-4 rounded-xl">
            <div className="flex flex-wrap gap-6 text-xs text-slate-500 mb-3">
              <span>Model: <span className="text-slate-400">{result.modelVersion}</span></span>
              <span>Time: <span className="text-slate-400">{Math.round(result.processingTimeMs)}ms</span></span>
              <span>Demo Mode: <span className="text-slate-400">{result.demoMode ? 'Yes' : 'No'}</span></span>
              <span>
                Data Completeness:{' '}
                <span className={
                  (estData?.data_completeness_score ?? 1) < 0.5
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }>
                  {Math.round((estData?.data_completeness_score ?? 1) * 100)}%
                </span>
              </span>
            </div>
            {/* Visible watermark */}
            <div className="flex items-center gap-2 pt-3 border-t border-white/10">
              <Info size={14} className="text-slate-600 flex-shrink-0" />
              <p className="text-[11px] text-slate-600 font-semibold tracking-wide uppercase">
                For Research & Educational Use Only — Not a Clinical Diagnostic Tool
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InferenceResultPage;
