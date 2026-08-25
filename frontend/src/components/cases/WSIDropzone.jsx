import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileImage, X, AlertCircle } from 'lucide-react';

const WSIDropzone = ({ onFileSelect, file }) => {
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles?.length > 0) {
      setError('Please upload a valid image file (TIFF, SVS, PNG, JPG).');
      return;
    }
    if (acceptedFiles?.length > 0) {
      setError(null);
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.tiff', '.tif'],
    },
    maxFiles: 1,
  });

  const removeFile = (e) => {
    e.stopPropagation();
    onFileSelect(null);
    setError(null);
  };

  return (
    <div className="w-full">
      {!file ? (
        <div 
          {...getRootProps()} 
          className="border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300"
          style={{
            borderColor: isDragActive ? 'var(--accent)' : error ? 'var(--role-malignant)' : 'var(--surface-border-hi)',
            background: isDragActive ? 'var(--accent-dim)' : error ? 'rgba(192,48,64,0.05)' : 'var(--surface-base)',
            transform: isDragActive ? 'scale(1.02)' : 'none',
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
            <UploadCloud size={32} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            {isDragActive ? "Drop WSI here..." : "Drag & drop WSI file here"}
          </h3>
          <p className="text-sm text-center max-w-sm" style={{ color: 'var(--text-secondary)' }}>
            Supported formats: TIFF, SVS, PNG, JPEG. Max size: 500MB.
          </p>
          
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
