import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WSIDropzone from '../components/cases/WSIDropzone';
import ClinicalForm from '../components/cases/ClinicalForm';
import LoadingOverlay from '../components/shared/LoadingOverlay';
import DisclaimerModal from '../components/shared/DisclaimerModal';
import toast from 'react-hot-toast';
import {
  ChevronRight, ChevronLeft, Upload, Activity, FileText,
  User, Stethoscope, Info, Sparkles, CheckCircle2
} from 'lucide-react';
import api from '../services/api';

// ─── Mode selector card ───────────────────────────────────────────────────────
const ModeCard = ({ icon: Icon, title, description, badge, color, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`
      w-full text-left p-6 rounded-2xl border-2 transition-all duration-300
      ${selected
        ? `border-${color}-500 bg-${color}-500/10 shadow-lg shadow-${color}-500/10`
        : 'border-white/10 bg-white/3 hover:border-white/25 hover:bg-white/5'}
    `}
  >
    <div className="flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
        selected ? `bg-${color}-500/20 text-${color}-400` : 'bg-white/5 text-slate-400'
      }`}>
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className={`font-bold text-base ${selected ? 'text-white' : 'text-slate-300'}`}>
            {title}
          </h3>
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
              selected
                ? `bg-${color}-500/30 text-${color}-300`
                : 'bg-white/10 text-slate-400'
            }`}>{badge}</span>
          )}
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
        selected ? `border-${color}-500 bg-${color}-500` : 'border-slate-600'
      }`}>
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </div>
  </button>
);

// ─── Main component ────────────────────────────────────────────────────────────
const NewCasePage = () => {
  const navigate = useNavigate();

  // Mode: 'patient' | 'clinician' | null (not selected yet)
  const [mode, setMode] = useState(null);
  const [step, setStep] = useState(0); // 0=mode-select, 1=image, 2=data, 3=review
  const [wsiFile, setWsiFile] = useState(null);
  const [patientAge, setPatientAge] = useState('');
  const [clinicalData, setClinicalData] = useState({
    age: '', tumor_size: '', lymph_nodes: '', grade: '2', ki67: 0,
    er_status: false, pr_status: false, her2_status: false,
    tp53_mutation: false, brca1_mutation: false,
  });
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

  const handleClinicalChange = (field, value) => {
    setClinicalData(prev => ({ ...prev, [field]: value }));
  };

  // ── Stepper config per mode ──────────────────────────────────────────────────
  const patientSteps = [
    { num: 1, title: 'Upload Scan', icon: Upload },
    { num: 2, title: 'Your Age',    icon: User },
    { num: 3, title: 'Analyse',     icon: Activity },
  ];
  const clinicianSteps = [
    { num: 1, title: 'WSI Upload',    icon: Upload },
    { num: 2, title: 'Clinical Data', icon: FileText },
    { num: 3, title: 'Analysis',      icon: Activity },
  ];
  const steps = mode === 'patient' ? patientSteps : clinicianSteps;

  // ── Validation ───────────────────────────────────────────────────────────────
  const validateStep = () => {
    if (step === 1 && !wsiFile) {
      toast.error('Please upload an image to continue'); return false;
    }
    if (step === 2) {
      if (mode === 'patient') {
        const a = parseFloat(patientAge);
        if (!patientAge || isNaN(a) || a < 18 || a > 110) {
          toast.error('Please enter a valid age (18-110)'); return false;
        }
      } else {
        if (!clinicalData.age || !clinicalData.tumor_size) {
          toast.error('Age and Tumor Size are required'); return false;
        }
      }
    }
    return true;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    // Show disclaimer before final submit step
    if (step === 2 && mode === 'patient' && !disclaimerAccepted) {
      setShowDisclaimer(true);
      return;
    }
    setStep(s => s + 1);
  };

  const handleDisclaimerAccept = () => {
    setDisclaimerAccepted(true);
    setShowDisclaimer(false);
    setStep(s => s + 1);
  };

  const handleModeSelect = (m) => {
    setMode(m);
    setStep(1);
  };

  // ── Submission ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let clinicalPayload;

      if (mode === 'patient') {
        // Patient mode: only age — ML service will estimate the rest
        clinicalPayload = { age: parseFloat(patientAge) };
      } else {
        // Clinician mode: full clinical panel
        clinicalPayload = {
          age:            parseFloat(clinicalData.age),
          tumor_size:     parseFloat(clinicalData.tumor_size),
          lymph_nodes:    parseInt(clinicalData.lymph_nodes) || 0,
          grade:          parseInt(clinicalData.grade) || 2,
          ki67:           parseFloat(clinicalData.ki67) || 0,
          er_status:      clinicalData.er_status ? 1 : 0,
          pr_status:      clinicalData.pr_status ? 1 : 0,
          her2_status:    clinicalData.her2_status ? 1 : 0,
          tp53_mutation:  clinicalData.tp53_mutation ? 1 : 0,
          brca1_mutation: clinicalData.brca1_mutation ? 1 : 0,
        };
      }

      setSubmitStatus('Uploading scan data...');
      const formData = new FormData();
      formData.append('wsiFile', wsiFile);
      formData.append('clinicalData', JSON.stringify(clinicalPayload));

      const caseRes = await api.post('/api/cases', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const caseId = caseRes.data.data._id;

      setSubmitStatus(
        mode === 'patient'
          ? 'Running AI scan analysis & estimating clinical profile...'
          : 'Launching multimodal AI analysis pipeline...'
      );
      await api.post(`/api/cases/${caseId}/analyze`);

      toast.success('Analysis started! Results will appear shortly.');
      navigate(`/cases/${caseId}/results`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Submission failed. Please try again.');
      setIsSubmitting(false);
      setSubmitStatus('');
    }
  };

  // ── Render helpers ───────────────────────────────────────────────────────────
  const progressPct = step === 0 ? 0 : ((step - 1) / (steps.length - 1)) * 100;

  return (
    <div className="max-w-4xl mx-auto w-full animate-fade-in relative pb-10">
      {isSubmitting && <LoadingOverlay message={submitStatus || 'Processing...'} />}
      {showDisclaimer && (
        <DisclaimerModal
          onAccept={handleDisclaimerAccept}
          onDecline={() => setShowDisclaimer(false)}
        />
      )}

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">New Diagnostic Case</h1>
        <p className="text-slate-400">
          AI-powered multimodal breast cancer screening.
        </p>
      </div>

      {/* ── STEP 0: Mode Selector ── */}
      {step === 0 && (
        <div className="card animate-slide-up">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-white mb-2">Who is submitting this case?</h2>
            <p className="text-slate-400 text-sm">
              Choose your profile so we can tailor the data requirements.
            </p>
          </div>

          <div className="space-y-4">
            <ModeCard
              icon={User}
              title="I'm a Patient"
              description="I only have my scan image. I don't have access to biopsy reports or lab results. The AI will estimate my clinical profile from the image."
              badge="Image + Age only"
              color="indigo"
              selected={mode === 'patient'}
              onClick={() => setMode('patient')}
            />
            <ModeCard
              icon={Stethoscope}
              title="I'm a Clinician / Researcher"
              description="I have the full clinical panel including biopsy results, receptor status, genomic data, and pathology grade."
              badge="Full clinical data"
              color="purple"
              selected={mode === 'clinician'}
              onClick={() => setMode('clinician')}
            />
          </div>

          {/* Info box */}
          <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-300 leading-relaxed">
              <strong>Patient Mode</strong> uses{' '}
              <span className="text-white font-medium">radiomics-based cross-modal imputation</span>{' '}
              — your scan image is analysed to estimate likely molecular markers, rather than
              using generic population averages. This preserves biological correlation for
              better accuracy.
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => mode && setStep(1)}
              disabled={!mode}
              className={`btn-primary flex items-center gap-2 ${!mode ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              Continue <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEPS 1-3 ── */}
      {step > 0 && (
        <>
          {/* Mode badge */}
          <div className="mb-6 flex items-center gap-2">
            {mode === 'patient'
              ? <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/15 px-3 py-1.5 rounded-full border border-indigo-500/25">
                  <User size={12} /> Patient Mode — Image + Age
                </span>
              : <span className="flex items-center gap-1.5 text-xs font-semibold text-purple-300 bg-purple-500/15 px-3 py-1.5 rounded-full border border-purple-500/25">
                  <Stethoscope size={12} /> Clinician Mode — Full Panel
                </span>
            }
            <button
              onClick={() => { setStep(0); setMode(null); }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
            >
              Change
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-10 relative">
            <div className="absolute left-0 top-6 w-full h-0.5 bg-white/10 -z-10 rounded-full">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {steps.map((s) => (
              <div key={s.num} className="flex flex-col items-center gap-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                  step > s.num
                    ? 'bg-emerald-500 border-navy-900 text-white'
                    : step === s.num
                    ? 'bg-indigo-500 border-navy-900 text-white'
                    : 'bg-navy-800 border-navy-900 text-slate-500'
                }`}>
                  {step > s.num ? <CheckCircle2 size={20} /> : <s.icon size={20} />}
                </div>
                <span className={`text-xs font-medium ${step >= s.num ? 'text-indigo-400' : 'text-slate-500'}`}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>

          <div className="card min-h-[400px] flex flex-col">
            <div className="flex-1">

              {/* ── Step 1: Upload image ── */}
              {step === 1 && (
                <div className="animate-slide-up">
                  <h2 className="text-lg font-semibold text-white mb-1">
                    {mode === 'patient' ? 'Upload Your Scan Image' : 'Histopathology Image Upload'}
                  </h2>
                  <p className="text-sm text-slate-400 mb-4">
                    {mode === 'patient'
                      ? 'Upload your MRI, mammogram, or histology scan (PNG, JPG, TIFF).'
                      : 'Upload a histopathology image. The AI analyses a 224×224 representative patch from the image.'}
                  </p>
                  <WSIDropzone onFileSelect={setWsiFile} file={wsiFile} />
                </div>
              )}

              {/* ── Step 2 (Patient): Age input ── */}
              {step === 2 && mode === 'patient' && (
                <div className="animate-slide-up max-w-md mx-auto">
                  <h2 className="text-lg font-semibold text-white mb-1">Your Age</h2>
                  <p className="text-sm text-slate-400 mb-6">
                    Age is used alongside your scan to estimate your clinical profile.
                    All other parameters will be estimated by AI from the image.
                  </p>

                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Age (years)
                  </label>
                  <input
                    type="number"
                    min="18" max="110"
                    placeholder="e.g. 52"
                    value={patientAge}
                    onChange={e => setPatientAge(e.target.value)}
                    className="input-field w-full text-2xl font-bold text-center py-5"
                  />

                  {/* What AI will estimate */}
                  <div className="mt-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wide">
                        AI will estimate from your scan:
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        'Tumor Grade', 'KI67 (%)', 'ER Status', 'PR Status',
                        'HER2 Status', 'Tumor Size', 'Lymph Nodes', 'TP53',
                        'BRCA1',
                      ].map(f => (
                        <div key={f} className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          <span className="text-xs text-slate-400">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ethical notice */}
                  <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-300 leading-relaxed">
                      ⚠ A disclaimer about research use and the importance of consulting
                      a doctor will appear before submission.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Step 2 (Clinician): Full clinical form ── */}
              {step === 2 && mode === 'clinician' && (
                <div className="animate-slide-up">
                  <h2 className="text-lg font-semibold text-white mb-1">Patient Clinical Information</h2>
                  <p className="text-sm text-slate-400 mb-4">
                    All fields below are used by the tabular AI branch. Higher data quality = higher result confidence.
                  </p>
                  <ClinicalForm values={clinicalData} onChange={handleClinicalChange} />
                </div>
              )}

              {/* ── Step 3: Review & Submit ── */}
              {step === 3 && (
                <div className="animate-slide-up space-y-5">
                  <h2 className="text-lg font-semibold text-white mb-1">Review & Analyse</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Image summary */}
                    <div className="glass p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                      <h3 className="text-xs font-semibold text-indigo-400 mb-2 uppercase tracking-wide">
                        Scan Image
                      </h3>
                      <p className="text-white text-sm truncate">{wsiFile?.name}</p>
                      <p className="text-xs text-slate-400 mt-1">{(wsiFile?.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>

                    {/* Clinical summary */}
                    <div className="glass p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
                      <h3 className="text-xs font-semibold text-purple-400 mb-2 uppercase tracking-wide">
                        {mode === 'patient' ? 'Known Parameters' : 'Clinical Panel'}
                      </h3>
                      {mode === 'patient' ? (
                        <div>
                          <p className="text-white text-sm">Age: {patientAge} years</p>
                          <p className="text-xs text-slate-400 mt-1">
                            9 remaining fields will be AI-estimated from the scan.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-white text-sm">
                            Age: {clinicalData.age} | Tumor: {clinicalData.tumor_size}mm | Grade: {clinicalData.grade}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            [{clinicalData.er_status ? 'ER+' : 'ER-'}
                            {' '}{clinicalData.pr_status ? 'PR+' : 'PR-'}
                            {' '}{clinicalData.her2_status ? 'HER2+' : 'HER2-'}]
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mode info panel */}
                  {mode === 'patient' && (
                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                      <div className="flex gap-3">
                        <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-indigo-300">Radiomics-Based Estimation</p>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            The AI will extract radiomic features (intensity, texture, edge patterns)
                            from your image to predict Grade, KI67, ER/PR/HER2 status, and other
                            markers before running the diagnostic model. Results will show which
                            parameters were AI-estimated.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Disclaimer reminder for clinician mode */}
                  {mode === 'clinician' && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-amber-300 leading-relaxed">
                        ⚠ <strong>Research Use Only:</strong> This AI system is a research prototype.
                        Results should not replace clinical judgement or established diagnostic protocols.
                      </p>
                    </div>
                  )}

                  <button onClick={handleSubmit} className="btn-primary w-full py-4 text-base font-bold">
                    🔬 Run Diagnostic Analysis
                  </button>
                </div>
              )}
            </div>

            {/* Navigation */}
            {step > 0 && (
              <div className="mt-8 pt-6 border-t border-white/10 flex justify-between">
                <button
                  onClick={() => step === 1 ? setStep(0) : setStep(s => s - 1)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <ChevronLeft size={18} /> Back
                </button>
                {step < 3 && (
                  <button onClick={nextStep} className="btn-primary flex items-center gap-2">
                    Continue <ChevronRight size={18} />
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NewCasePage;
