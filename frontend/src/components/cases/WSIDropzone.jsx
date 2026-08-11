import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileImage, X, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/helpers';

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
          className={cn(
            "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
            isDragActive ? "border-indigo-500 bg-indigo-500/10 scale-[1.02]" : "border-slate-600 bg-white/5 hover:bg-white/10 hover:border-slate-500",
            error && "border-rose-500 bg-rose-500/5"
          )}
        >
          <input {...getInputProps()} />
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors",
            isDragActive ? "bg-indigo-500 text-white" : "bg-slate-800 text-indigo-400"
          )}>
            <UploadCloud size={32} />
          </div>
          <h3 className="text-lg font-semibold text-slate-200 mb-2">
            {isDragActive ? "Drop WSI here..." : "Drag & drop WSI file here"}
          </h3>
          <p className="text-sm text-slate-400 text-center max-w-sm">
            Supported formats: TIFF, SVS, PNG, JPEG. Max size: 500MB.
          </p>
          
          {error && (
            <div className="mt-4 flex items-center gap-2 text-rose-400 bg-rose-500/10 px-4 py-2 rounded-lg">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="glass p-6 rounded-2xl flex items-center justify-between border-indigo-500/30 bg-indigo-500/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <FileImage size={24} />
            </div>
            <div>
              <p className="font-medium text-slate-200">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>
          <button 
            onClick={removeFile}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default WSIDropzone;
