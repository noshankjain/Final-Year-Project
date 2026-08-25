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
const ModeCard = ({ icon: Icon, title, description, badge, selected, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left p-6 rounded-2xl border-2 transition-all duration-300"
    style={{
      borderColor: selected ? 'var(--accent)' : 'var(--surface-border)',
      background: selected ? 'var(--accent-dim)' : 'var(--surface-raised)',
      boxShadow: selected ? 'var(--shadow-raised)' : 'var(--shadow-card)',
    }}
  >
    <div className="flex items-start gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: selected ? 'var(--accent-glow)' : 'var(--surface-base)', color: selected ? 'var(--accent)' : 'var(--text-tertiary)' }}
      >
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-base" style={{ color: selected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {title}
          </h3>
          {badge && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: selected ? 'var(--accent-glow)' : 'var(--surface-base)', color: selected ? 'var(--accent)' : 'var(--text-tertiary)' }}
            >{badge}</span>
          )}
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      </div>
      <div
        className="w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all"
        style={{ borderColor: selected ? 'var(--accent)' : 'var(--surface-border-hi)', background: selected ? 'var(--accent)' : 'transparent' }}
      >
        {selected && <div className="w-2 h-2 rounded-full" style={{ background: '#F1ECE6' }} />}
      </div>
    </div>
  </button>
);

// ─── Main component ────────────────────────────────────────────────────────────
const NewCasePage = () => {
  const navigate = useNavigate();

  const [mode, setMode] = useState(null);
  const [step, setStep] = useState(0);
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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let clinicalPayload;
      if (mode === 'patient') {
        clinicalPayload = { age: parseFloat(patientAge) };
      } else {
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

  const progressPct = step === 0 ? 0 : ((step - 1) / (steps.length - 1)) * 100;

  return (
    <div className="max-w-4xl mx-auto w-full animate-fade-up relative pb-10">
      {isSubmitting && <LoadingOverlay message={submitStatus || 'Processing...'} />}
      {showDisclaimer && (
        <DisclaimerModal
          onAccept={handleDisclaimerAccept}
          onDecline={() => setShowDisclaimer(false)}
        />
      )}

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>New Diagnostic Case</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          AI-powered multimodal breast cancer screening.
        </p>
      </div>

      {/* ── STEP 0: Mode Selector ── */}
      {step === 0 && (
        <div className="surface p-6 animate-fade-up">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Who is submitting this case?</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Choose your profile so we can tailor the data requirements.
            </p>
          </div>

          <div className="space-y-4">
            <ModeCard
              icon={User}
              title="I'm a Patient"
              description="I only have my scan image. I don't have access to biopsy reports or lab results. The AI will estimate my clinical profile from the image."
              badge="Image + Age only"
              selected={mode === 'patient'}
              onClick={() => setMode('patient')}
            />
            <ModeCard
              icon={Stethoscope}
              title="I'm a Clinician / Researcher"
              description="I have the full clinical panel including biopsy results, receptor status, genomic data, and pathology grade."
              badge="Full clinical data"
              selected={mode === 'clinician'}
              onClick={() => setMode('clinician')}
            />
          </div>

          {/* Info box */}
          <div className="mt-6 p-4 rounded-xl flex gap-3" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)' }}>
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Patient Mode</strong> uses{' '}
              <span style={{ color: 'var(--accent)' }}>radiomics-based cross-modal imputation</span>{' '}
              — your scan image is analysed to estimate likely molecular markers, rather than
              using generic population averages. This preserves biological correlation for
              better accuracy.
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={() => mode && setStep(1)}
              disabled={!mode}
              className="btn-primary flex items-center gap-2"
              style={{ opacity: !mode ? 0.4 : 1, cursor: !mode ? 'not-allowed' : 'pointer' }}
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
              ? <span className="chip-accent flex items-center gap-1.5">
                  <User size={12} /> Patient Mode — Image + Age
                </span>
              : <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-glow)' }}>
                  <Stethoscope size={12} /> Clinician Mode — Full Panel
                </span>
            }
            <button
              onClick={() => { setStep(0); setMode(null); }}
              className="text-xs hover:underline underline-offset-2 transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Change
            </button>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-10 relative">
            <div className="absolute left-0 top-6 w-full h-0.5 -z-10 rounded-full" style={{ background: 'var(--surface-border)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: 'var(--accent)' }}
              />
            </div>
            {steps.map((s) => (
              <div key={s.num} className="flex flex-col items-center gap-2">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300"
                  style={{
                    borderColor: 'var(--surface-base)',
                    background: step > s.num
                      ? 'var(--role-benign)'
                      : step === s.num
                        ? 'var(--accent)'
                        : 'var(--surface-overlay)',
                    color: step >= s.num ? '#F1ECE6' : 'var(--text-tertiary)',
                  }}
                >
                  {step > s.num ? <CheckCircle2 size={20} /> : <s.icon size={20} />}
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color: step >= s.num ? 'var(--accent)' : 'var(--text-tertiary)' }}
                >
                  {s.title}
                </span>
              </div>
            ))}
          </div>

          <div className="surface min-h-[400px] flex flex-col p-6">
            <div className="flex-1">

              {/* ── Step 1: Upload image ── */}
              {step === 1 && (
                <div className="animate-fade-up">
                  <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {mode === 'patient' ? 'Upload Your Scan Image' : 'Histopathology Image Upload'}
                  </h2>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    {mode === 'patient'
                      ? 'Upload your MRI, mammogram, or histology scan (PNG, JPG, TIFF).'
                      : 'Upload a histopathology image. The AI analyses a 224×224 representative patch from the image.'}
                  </p>
                  <WSIDropzone onFileSelect={setWsiFile} file={wsiFile} />
                </div>
              )}

              {/* ── Step 2 (Patient): Age input ── */}
              {step === 2 && mode === 'patient' && (
                <div className="animate-fade-up max-w-md mx-auto">
                  <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Your Age</h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                    Age is used alongside your scan to estimate your clinical profile.
                    All other parameters will be estimated by AI from the image.
                  </p>

                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
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
                  <div className="mt-6 p-4 rounded-xl" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
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
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ethical notice */}
                  <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(150,106,40,0.08)', border: '1px solid rgba(150,106,40,0.2)' }}>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--role-warning)' }}>
                      A disclaimer about research use and the importance of consulting
                      a doctor will appear before submission.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Step 2 (Clinician): Full clinical form ── */}
              {step === 2 && mode === 'clinician' && (
                <div className="animate-fade-up">
                  <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Patient Clinical Information</h2>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    All fields below are used by the tabular AI branch. Higher data quality = higher result confidence.
                  </p>
                  <ClinicalForm values={clinicalData} onChange={handleClinicalChange} />
                </div>
              )}

              {/* ── Step 3: Review & Submit ── */}
              {step === 3 && (
                <div className="animate-fade-up space-y-5">
                  <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Review & Analyse</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Image summary */}
                    <div className="p-4 rounded-xl" style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}>
                      <h3 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
                        Scan Image
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{wsiFile?.name}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{(wsiFile?.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>

                    {/* Clinical summary */}
                    <div className="p-4 rounded-xl" style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}>
                      <h3 className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
                        {mode === 'patient' ? 'Known Parameters' : 'Clinical Panel'}
                      </h3>
                      {mode === 'patient' ? (
                        <div>
                          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Age: {patientAge} years</p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                            9 remaining fields will be AI-estimated from the scan.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            Age: {clinicalData.age} | Tumor: {clinicalData.tumor_size}mm | Grade: {clinicalData.grade}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
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
                    <div className="p-4 rounded-xl" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)' }}>
                      <div className="flex gap-3">
                        <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>Radiomics-Based Estimation</p>
                          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
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
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(150,106,40,0.08)', border: '1px solid rgba(150,106,40,0.2)' }}>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--role-warning)' }}>
                        <strong>Research Use Only:</strong> This AI system is a research prototype.
                        Results should not replace clinical judgement or established diagnostic protocols.
                      </p>
                    </div>
                  )}

                  <button onClick={handleSubmit} className="btn-primary w-full py-4 text-base font-bold">
                    Run Diagnostic Analysis
                  </button>
                </div>
              )}
            </div>

            {/* Navigation */}
            {step > 0 && (
              <div className="mt-8 pt-6 flex justify-between" style={{ borderTop: '1px solid var(--surface-border)' }}>
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
