/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        navy: { 900: '#0f172a', 800: '#1e293b', 700: '#334155' },
        accent: { DEFAULT: '#6366f1', light: '#818cf8', dark: '#4f46e5' },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 15px rgba(99,102,241,0.4)' }, '50%': { boxShadow: '0 0 30px rgba(99,102,241,0.8)' } },
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
