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
        // Base surfaces — Alabaster Cream palette (v5)
        surface: {
          base:    '#F1ECE6',  // Alabaster Cream — page background
          raised:  '#DDD5CD',  // Warm Greige — cards, sidebar
          overlay: '#CFC7BE',  // Deeper greige — overlays, dropdowns
        },
        // Single accent — Vintage Rosewood (#7D4047). Color consistency lock.
        rosewood: {
          DEFAULT: '#7D4047',
          dim:     'rgba(125,64,71,0.10)',
          glow:    'rgba(125,64,71,0.22)',
        },
        // Semantic roles — adjusted for light background
        malignant: '#C03040',
        benign:    '#2B7A57',
        caution:   '#966A28',
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
