import React, { useState } from 'react';
import { Layers, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../utils/helpers';

const GradCAMViewer = ({ originalImagePath, gradcamImagePath }) => {
  const [showOverlay, setShowOverlay] = useState(true);

  // In a real app, these would be absolute URLs from the backend
  // For demo, we use placeholder gradients if not provided
  const imgUrl = showOverlay ? gradcamImagePath : originalImagePath;

  return (
    <div className="card h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-slate-400 font-medium uppercase tracking-wider text-sm flex items-center gap-2">
          <Layers size={16} />
          <span>Spatial Attention (Grad-CAM)</span>
        </h3>
        
        <div className="flex bg-navy-800 p-1 rounded-lg border border-white/10">
          <button
            onClick={() => setShowOverlay(false)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5",
              !showOverlay ? "bg-indigo-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
            )}
          >
            <ImageIcon size={14} /> Original
          </button>
          <button
            onClick={() => setShowOverlay(true)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5",
              showOverlay ? "bg-purple-500 text-white shadow-sm" : "text-slate-400 hover:text-white"
            )}
          >
            <Layers size={14} /> Heatmap
          </button>
        </div>
      </div>

      <div className="flex-1 relative rounded-xl overflow-hidden bg-navy-800 border border-white/5 min-h-[300px] flex items-center justify-center group">
        {imgUrl ? (
          <img 
            src={imgUrl} 
            alt="WSI View" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
            <div className={cn(
              "w-full h-full absolute inset-0 opacity-20",
              showOverlay ? "bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-500" : "bg-slate-700"
            )}></div>
            <ImageIcon size={48} className="mb-4 relative z-10 opacity-50" />
            <p className="relative z-10 text-sm">Image data unavailable</p>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-4 text-center">
        {showOverlay 
          ? "Red/warm regions indicate tissue patterns highly associated with the model's prediction." 
          : "Original H&E stained Whole Slide Image crop."}
      </p>
    </div>
  );
};

export default GradCAMViewer;
