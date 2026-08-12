import React, { useState } from 'react';
import { Sliders, Image as PhImage } from '@phosphor-icons/react';

// GradCAMViewer — no uppercase tracking eyebrow, no neon blend modes
const GradCAMViewer = ({ originalImagePath, gradcamImagePath }) => {
  const [showOverlay, setShowOverlay] = useState(true);
  const imgUrl = showOverlay ? gradcamImagePath : originalImagePath;

  return (
    <div className="surface-elevated h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Spatial attention (Grad-CAM)
        </p>

        {/* Toggle — no purple, teal for active */}
        <div
          className="flex p-1 rounded-lg gap-1"
          style={{ background: 'var(--surface-base)', border: '1px solid var(--surface-border)' }}
        >
          {[
            { label: 'Original', value: false, icon: PhImage },
            { label: 'Heatmap',  value: true,  icon: Sliders },
          ].map(({ label, value, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setShowOverlay(value)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background: showOverlay === value ? 'var(--surface-overlay)' : 'transparent',
                color:      showOverlay === value ? (value ? 'var(--accent)' : 'var(--text-primary)') : 'var(--text-tertiary)',
                border:     showOverlay === value ? '1px solid var(--surface-border-hi)' : '1px solid transparent',
              }}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Image area — no pills overlaid on image (§9.F) */}
      <div
        className="flex-1 relative rounded-lg overflow-hidden min-h-[280px] flex items-center justify-center"
        style={{ background: 'var(--surface-base)' }}
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={showOverlay ? 'Grad-CAM heatmap overlay' : 'Original histopathology image'}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <PhImage size={36} style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Image unavailable
            </p>
          </div>
        )}
      </div>

      {/* Caption — plain, no fake photo attribution (§9.F) */}
      <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-tertiary)' }}>
        {showOverlay
          ? 'Warm regions indicate tissue patterns most influential for the model prediction.'
          : 'Original H&E stained histopathology patch (224px representative crop).'}
      </p>
    </div>
  );
};

export default GradCAMViewer;
