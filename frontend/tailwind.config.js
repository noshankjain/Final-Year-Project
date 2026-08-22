/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Base surfaces — Cosmic (#23212C) palette
        surface: {
          base:    '#23212C',
          raised:  '#2B293A',
          overlay: '#333143',
        },
        // Single accent — Vanilla (#F1FEC8). Color consistency lock.
        vanilla: {
          DEFAULT: '#F1FEC8',
          dim:     'rgba(241,254,200,0.12)',
          glow:    'rgba(241,254,200,0.22)',
        },
        // Semantic roles — unchanged (functional, not brand)
        malignant: '#f43f5e',
        benign:    '#10b981',
        caution:   '#f59e0b',
      },
      borderRadius: {
        // Shape consistency lock: 12px base
        sm:   '6px',
        md:   '12px',
        lg:   '16px',
        xl:   '20px',
        full: '9999px',
      },
      animation: {
        'fade-up':  'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'shimmer':  'shimmer 1.6s ease infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [],
}
