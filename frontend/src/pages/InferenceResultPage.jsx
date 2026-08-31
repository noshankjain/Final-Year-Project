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
        <span style={{ color: 'var(--text-secondary)' }}>Confidence</span>
        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{pct}%</span>
      </div>
      {/* Bar */}
      <div className="relative h-3 rounded-full overflow-visible" style={{ background: 'var(--surface-base)' }}>
        {/* CI range shading */}
        <div
          className="absolute top-0 h-full rounded-full opacity-30"
          style={{
            left: `${lPct}%`,
            width: `${uPct - lPct}%`,
            background: 'var(--accent)',
          }}
        />
        {/* Point estimate */}
        <div
          className="absolute top-0 h-full w-1 rounded-full"
          style={{ left: `${pct}%`, background: 'var(--text-primary)', boxShadow: 'var(--shadow-raised)' }}
        />
      </div>
      <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
        <span>{lPct}% (lower bound)</span>
        {patientMode && <span style={{ color: 'var(--role-warning)' }}>Wider CI — estimated parameters</span>}
        <span>{uPct}% (upper bound)</span>
      </div>
    </div>
  );
};

// ─── Early Warning Score card (for patient mode) ──────────────────────────────
const EarlyWarningCard = ({ diagnosis, confidence, lower, upper }) => {
  const pct  = Math.round(confidence * 100);
  const lPct = Math.round(lower * 100);
  const uPct = Math.round(upper * 100);

  // Map to a 1-5 risk score
  let score, label, roleColor, desc;
  if (pct < 40)        { score = 1; label = 'Very Low Risk';  roleColor = 'var(--role-benign)';   desc = 'Screening suggests low concern. Routine check-up recommended.'; }
  else if (pct < 55)   { score = 2; label = 'Low-Moderate Risk'; roleColor = '#5a8a4a'; desc = 'Some indicators present. Follow-up screening advised.'; }
  else if (pct < 70)   { score = 3; label = 'Moderate Risk';   roleColor = 'var(--role-warning)';  desc = 'Notable indicators detected. Prompt consultation recommended.'; }
  else if (pct < 85)   { score = 4; label = 'High Risk';       roleColor = '#b85c1a'; desc = 'Significant indicators detected. Urgent medical consultation required.'; }
  else                  { score = 5; label = 'Very High Risk';  roleColor = 'var(--role-malignant)'; desc = 'Strong indicators of concern. Seek immediate medical attention.'; }

  return (
    <div className="surface-elevated rounded-2xl p-6" style={{ border: `1px solid ${roleColor}30` }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-tertiary)' }}>
            Early Warning Score
          </p>
          <h2 className="text-2xl font-bold" style={{ color: roleColor }}>{label}</h2>
        </div>
        <div
          className="w-14 h-14 rounded-xl flex flex-col items-center justify-center"
          style={{ background: `${roleColor}15`, border: `1px solid ${roleColor}25` }}
        >
          <span className="text-2xl font-black" style={{ color: roleColor }}>{score}</span>
          <span className="text-[9px] font-medium" style={{ color: 'var(--text-tertiary)' }}>/ 5</span>
        </div>
      </div>

      {/* Score dots */}
      <div className="flex gap-2 mb-4">
        {[1,2,3,4,5].map(i => (
          <div
            key={i}
            className="flex-1 h-2 rounded-full transition-all"
            style={{ background: i <= score ? roleColor : 'var(--surface-base)' }}
          />
        ))}
      </div>

      <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{desc}</p>

      <ConfidenceIntervalBar
        confidence={confidence}
        lower={lower}
        upper={upper}
        patientMode={true}
      />

      <p className="mt-3 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
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
      return caseFields.status !== 'processing';
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
      <AlertTriangle className="w-16 h-16" style={{ color: 'var(--role-malignant)' }} />
      <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Error Loading Case</h2>
      <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
      <button onClick={() => navigate('/cases')} className="btn-secondary">← Back to Cases</button>
    </div>
  );

  const isProcessing = caseData?.status === 'processing';
  const isFailed     = caseData?.status === 'failed';
  const isPending    = caseData?.status === 'pending';
  const isComplete   = caseData?.status === 'complete';

  const patientMode  = result?.patientMode === true;
  const estData      = result?.estimatedClinicalData || null;
  const confLower    = result?.confidenceLower ?? (result?.confidence ? result.confidence - 0.05 : 0);
  const confUpper    = result?.confidenceUpper ?? (result?.confidence ? result.confidence + 0.05 : 1);

  // Incoherence flag: diagnosis says benign (low malignancy confidence) but
  // prognosis shows high risk. The two heads are independent sigmoid outputs —
  // prognosis is driven by clinical parameters, not the image diagnosis result.
  const isBenignHighRisk = isComplete && result &&
    result.diagnosis === 'benign' &&
    (result.confidence ?? 0) < 0.35 &&
    (result.survivalProbability ?? 1) < 0.55;

  return (
    <div className="space-y-6 animate-fade-up pb-20 print:bg-white print:text-black">

      {/* ── RESEARCH WATERMARK (print-only) ─────────────────────────────── */}
      <div className="hidden print:flex items-center justify-center py-3 mb-4 border-2 rounded-lg" style={{ borderColor: 'var(--role-malignant)' }}>
        <p className="font-black text-lg text-center tracking-widest uppercase" style={{ color: 'var(--role-malignant)' }}>
          FOR RESEARCH USE ONLY — NOT A MEDICAL DIAGNOSIS
        </p>
      </div>

      {/* ── ETHICAL DISCLAIMER BANNER ────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 rounded-xl print:hidden" style={{ background: 'rgba(150,106,40,0.10)', border: '1px solid rgba(150,106,40,0.25)' }}>
        <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--role-warning)' }} />
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color: 'var(--role-warning)' }}>Research Screening Tool — Not a Medical Diagnosis</p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            This AI result is for research and educational purposes only. It must{' '}
            <strong style={{ color: 'var(--role-warning)' }}>not</strong> replace consultation with a qualified
            oncologist, radiologist, or physician. If you have health concerns, please seek
            immediate professional medical advice.
          </p>
        </div>
      </div>

      {/* ── INCOHERENCE WARNING — benign image but high-risk prognosis ───── */}
      {isBenignHighRisk && (
        <div className="flex items-start gap-3 p-4 rounded-xl print:hidden" style={{ background: 'rgba(192,48,64,0.08)', border: '1px solid rgba(192,48,64,0.22)' }}>
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--role-malignant)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--role-malignant)' }}>
              Note: Diagnosis and Prognosis results appear contradictory
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              The image analysis head classified this case as <strong style={{ color: 'var(--role-benign)' }}>Benign</strong>,
              but the prognosis head shows a high-risk survival estimate. This happens because the two AI
              heads are <strong style={{ color: 'var(--text-primary)' }}>independent models</strong> — the
              prognosis is calculated entirely from the clinical parameters you entered (tumor size, grade,
              receptor status, etc.), not from the image finding. If the clinical data entered represents an
              aggressive profile, the prognosis head will reflect that regardless of the image result.{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                In this case, prioritise the clinical diagnosis from your oncologist over these AI estimates.
              </strong>
            </p>
          </div>
        </div>
      )}

      {/* ── PATIENT MODE BANNER ──────────────────────────────────────────── */}
      {patientMode && isComplete && (
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)' }}>
          <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Patient Mode — AI-Estimated Clinical Profile</p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Clinical parameters were estimated from your scan using radiomics analysis.
              Results show an <strong style={{ color: 'var(--text-primary)' }}>Early Warning Score</strong> with wider
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
            className="flex items-center gap-1 text-sm mb-2 transition-colors print:hidden"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ChevronLeft size={16} /> Back to Cases
          </button>
          <h1 className="text-2xl font-bold tracking-tight flex flex-wrap items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            {patientMode ? 'Screening Report' : 'Analysis Report'}
            <span className="text-sm font-mono px-2 py-1 rounded-md" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-glow)' }}>
              {truncateUUID(caseData?.patientUUID)}
            </span>
            <StatusBadge status={caseData?.status} />
            {patientMode && (
              <span className="chip-accent flex items-center gap-1">
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
      <div className="surface p-4 rounded-xl flex flex-wrap gap-6 text-sm">
        <div className="flex items-center gap-2">
          <User size={16} style={{ color: 'var(--text-tertiary)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Patient UUID:</span>
          <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{caseData?.patientUUID}</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText size={16} style={{ color: 'var(--text-tertiary)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Date:</span>
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(caseData?.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          {patientMode
            ? <span className="chip-accent flex items-center gap-1"><Sparkles size={10} /> Patient Mode</span>
            : <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-glow)' }}><Stethoscope size={10} /> Clinician Mode</span>
          }
        </div>
      </div>

      {/* ── PROCESSING STATE ─────────────────────────────────────────────── */}
      {isProcessing && (
        <div className="glass-surface p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>AI Model is Analysing...</p>
          <p style={{ color: 'var(--text-secondary)' }} className="text-sm">
            {patientMode
              ? 'Extracting radiomic features, estimating clinical profile, running diagnostic model...'
              : 'Running multimodal fusion through ResNet50 + MLP + Cross-Attention layers...'}
          </p>
          <p style={{ color: 'var(--text-tertiary)' }} className="text-xs">This page updates automatically.</p>
        </div>
      )}

      {/* ── FAILED STATE ─────────────────────────────────────────────────── */}
      {isFailed && (
        <div className="glass-surface p-8 flex flex-col items-center gap-4 text-center" style={{ border: '1px solid rgba(192,48,64,0.2)' }}>
          <AlertTriangle className="w-12 h-12" style={{ color: 'var(--role-malignant)' }} />
          <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Analysis Failed</p>
          <p style={{ color: 'var(--text-secondary)' }} className="text-sm">The ML service encountered an error. Please retry.</p>
          <button onClick={handleAnalyze} className="btn-primary mt-2">Retry Analysis</button>
        </div>
      )}

      {/* ── PENDING STATE ────────────────────────────────────────────────── */}
      {isPending && (
        <div className="glass-surface p-8 flex flex-col items-center gap-4 text-center" style={{ border: '1px solid var(--role-warning)30' }}>
          <RefreshCw className="w-10 h-10" style={{ color: 'var(--role-warning)' }} />
          <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Analysis Not Started</p>
          <p style={{ color: 'var(--text-secondary)' }} className="text-sm">Click "Run Analysis" to begin the AI diagnostic pipeline.</p>
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
          <div className="surface p-4 rounded-xl">
            <div className="flex flex-wrap gap-6 text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
              <span>Model: <span style={{ color: 'var(--text-secondary)' }}>{result.modelVersion}</span></span>
              <span>Time: <span style={{ color: 'var(--text-secondary)' }}>{Math.round(result.processingTimeMs)}ms</span></span>
              <span>Demo Mode: <span style={{ color: 'var(--text-secondary)' }}>{result.demoMode ? 'Yes' : 'No'}</span></span>
              <span>
                Data Completeness:{' '}
                <span style={{
                  color: (estData?.data_completeness_score ?? 1) < 0.5
                    ? 'var(--role-warning)'
                    : 'var(--role-benign)'
                }}>
                  {Math.round((estData?.data_completeness_score ?? 1) * 100)}%
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid var(--surface-border)' }}>
              <Info size={14} style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: 'var(--text-tertiary)' }}>
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
