import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileImage, X, AlertCircle, AlertTriangle, ArrowRight } from 'lucide-react';

// ─── H&E Histopathology Image Validator ───────────────────────────────────────
// Samples pixels from the image using a canvas and checks two things:
// 1. Is the image predominantly grayscale? (MRI, CT, ultrasound, mammogram)
// 2. Does it have the pink/purple color signature of H&E stained tissue?
//
// Returns: { valid: true } or { valid: false, type: 'grayscale'|'wrong_color', message: string }
const validateHistopathologyImage = (file) => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        // Sample at 50×50 = 2500 pixels — fast, representative
        const SAMPLE = 50;
        const canvas = document.createElement('canvas');
        canvas.width = SAMPLE;
        canvas.height = SAMPLE;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
        const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);
        URL.revokeObjectURL(url);

        let totalSaturation = 0;
        let grayPixels = 0;
        let pinkPurplePixels = 0;
        const TOTAL = SAMPLE * SAMPLE;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          // Skip near-white background pixels (common in H&E slides)
          if (r > 235 && g > 235 && b > 235) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          // Saturation in HSV: (max - min) / max
          const sat = max > 0 ? (max - min) / max : 0;
          totalSaturation += sat;

          if (sat < 0.12) grayPixels++;

          // Pink range (eosin stain): high R, moderate G, moderate B
          const isPink = r > 160 && g > 80 && g < 200 && b > 80 && b < 200 && sat > 0.12;
          // Purple range (hematoxylin stain): moderate R, low G, higher B
          const isPurple = r > 80 && r < 200 && g < 140 && b > 100 && sat > 0.15;

          if (isPink || isPurple) pinkPurplePixels++;
        }

        const avgSat = totalSaturation / TOTAL;
        const grayRatio = grayPixels / TOTAL;
        const pinkPurpleRatio = pinkPurplePixels / TOTAL;

        // Grayscale image: MRI, CT, ultrasound, mammogram
        if (avgSat < 0.10 || grayRatio > 0.72) {
          resolve({
            valid: false,
            type: 'grayscale',
            message: 'This image appears to be grayscale (MRI, CT scan, ultrasound, or mammogram). This model is trained exclusively on H&E stained histopathology slides and will produce unreliable results for other image types.',
          });
          return;
        }

        // Colored but doesn't have the pink/purple H&E signature
        if (pinkPurpleRatio < 0.08 && avgSat < 0.22) {
          resolve({
            valid: false,
            type: 'wrong_color',
            message: 'This image does not appear to be an H&E stained tissue slide. Histopathology slides have a characteristic pink (eosin) and purple (hematoxylin) color profile. Please upload a slide stained with H&E.',
          });
          return;
        }

        resolve({ valid: true });
      } catch {
        URL.revokeObjectURL(url);
        // On any canvas error, allow the upload (don't block on tool failure)
        resolve({ valid: true });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ valid: true });
    };

    img.src = url;
  });
};

// ─── Component ────────────────────────────────────────────────────────────────
const WSIDropzone = ({ onFileSelect, file }) => {
  const [error, setError] = useState(null);
  // validationWarning: { type, message } — soft warning, user can override
  const [validationWarning, setValidationWarning] = useState(null);
  // pendingFile: the file that triggered a warning, held until user decides
  const [pendingFile, setPendingFile] = useState(null);
  const [validating, setValidating] = useState(false);

  const processFile = useCallback(async (accepted) => {
    if (!accepted?.length) return;
    const f = accepted[0];
    setValidating(true);
    setValidationWarning(null);
    setError(null);

    const result = await validateHistopathologyImage(f);
    setValidating(false);

    if (!result.valid) {
      // Hold the file and show a warning — user can still override
      setPendingFile(f);
      setValidationWarning({ type: result.type, message: result.message });
    } else {
      onFileSelect(f);
    }
  }, [onFileSelect]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles?.length > 0) {
      setError('Please upload a valid image file (TIFF, SVS, PNG, JPG).');
      setValidationWarning(null);
      setPendingFile(null);
      return;
    }
    processFile(acceptedFiles);
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.tiff', '.tif'] },
    maxFiles: 1,
  });

  const removeFile = (e) => {
    e.stopPropagation();
    onFileSelect(null);
    setError(null);
    setValidationWarning(null);
    setPendingFile(null);
  };

  // User acknowledges the warning and uploads anyway
  const proceedAnyway = () => {
    if (pendingFile) {
      onFileSelect(pendingFile);
      setPendingFile(null);
      setValidationWarning(null);
    }
  };

  const dismissWarning = () => {
    setPendingFile(null);
    setValidationWarning(null);
  };

  return (
    <div className="w-full space-y-3">

      {/* ── Validation warning panel ────────────────────────────────────── */}
      {validationWarning && !file && (
        <div className="p-4 rounded-xl" style={{ background: 'rgba(192,48,64,0.08)', border: '1px solid rgba(192,48,64,0.25)' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--role-malignant)' }} />
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--role-malignant)' }}>
                {validationWarning.type === 'grayscale'
                  ? 'Grayscale image detected — not a histopathology slide'
                  : 'Image may not be an H&E histopathology slide'}
              </p>
              <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
                {validationWarning.message}
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={dismissWarning}
                  className="btn-primary flex items-center gap-1.5"
                  style={{ padding: '7px 14px', fontSize: '13px' }}
                >
                  Choose a different image
                </button>
                <button
                  onClick={proceedAnyway}
                  className="btn-secondary flex items-center gap-1.5"
                  style={{ padding: '7px 14px', fontSize: '13px' }}
                >
                  Upload anyway <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Dropzone or file preview ──────────────────────────────────── */}
      {!file ? (
        <div
          {...getRootProps()}
          className="border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
          style={{
            borderColor: isDragActive ? 'var(--accent)' : error ? 'var(--role-malignant)' : 'var(--surface-border-hi)',
            background: isDragActive ? 'var(--accent-dim)' : error ? 'rgba(192,48,64,0.05)' : 'var(--surface-base)',
            transform: isDragActive ? 'scale(1.02)' : 'none',
            opacity: validating ? 0.7 : 1,
            pointerEvents: validating ? 'none' : 'auto',
          }}
        >
          <input {...getInputProps()} />
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors"
            style={{
              background: isDragActive ? 'var(--accent)' : 'var(--surface-overlay)',
              color: isDragActive ? '#F1ECE6' : 'var(--accent)',
            }}
          >
            {validating
              ? <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              : <UploadCloud size={32} />
            }
          </div>

          <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            {validating ? 'Checking image type...' : isDragActive ? 'Drop here...' : 'Drag & drop histopathology image'}
          </h3>
          <p className="text-sm text-center max-w-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            {validating
              ? 'Validating color profile to confirm H&E staining...'
              : 'Supported: H&E stained tissue slides (PNG, JPG, TIFF). Max 500 MB.'}
          </p>
          {!validating && (
            <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
              MRI, CT, ultrasound, and mammogram images are not supported.
            </p>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'rgba(192,48,64,0.08)', color: 'var(--role-malignant)' }}>
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="surface p-6 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
              <FileImage size={24} />
            </div>
            <div>
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>
          <button
            onClick={removeFile}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--role-malignant)'; e.currentTarget.style.background = 'rgba(192,48,64,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default WSIDropzone;
