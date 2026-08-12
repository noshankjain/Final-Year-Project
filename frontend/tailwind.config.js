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
        // Base surfaces — off-black, never pure #000
        surface: {
          base:    '#080c14',
          raised:  '#0e1521',
          overlay: '#141d2e',
        },
        // Single accent — electric teal. Color consistency lock.
        teal: {
          DEFAULT: '#00d4b4',
          dim:     'rgba(0,212,180,0.15)',
          glow:    'rgba(0,212,180,0.25)',
        },
        // Semantic roles
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
