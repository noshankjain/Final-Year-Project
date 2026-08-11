import React from 'react';

const LoadingOverlay = ({ message = 'Analyzing...' }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-navy-900/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 border-4 border-l-purple-500 rounded-full animate-spin-slow opacity-70"></div>
        <div className="absolute inset-4 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full animate-pulse-glow opacity-20"></div>
      </div>
      <h3 className="text-xl font-bold gradient-text animate-pulse">{message}</h3>
    </div>
  );
};

export default LoadingOverlay;
