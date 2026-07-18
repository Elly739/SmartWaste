/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        /* Brand green — pulled from logo top gradient */
        primary: {
          50:  '#f0fdf6',
          100: '#dcfceb',
          200: '#baf7d6',
          300: '#84f0b5',
          400: '#4ade87',
          500: '#22c55e',   /* logo bright green */
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        /* Brand navy — pulled from logo bottom curve */
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#3b5bdb',
          600: '#1e40af',
          700: '#1e3a8a',
          800: '#1e3a6e',   /* logo navy */
          900: '#1a2e5a',
          950: '#0f1d3d',
        },
        /* Amber accent for points/rewards */
        gold: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out both',
        'fade-up': 'fadeUp 0.6s ease-out both',
        'slide-up': 'slideUp 0.35s ease-out both',
        'float': 'float 5s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'spin-slow': 'spin 4s linear infinite',
        'bounce-soft': 'bounceSoft 2s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeUp:    { '0%': { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideUp:   { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        float:     { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        bounceSoft:{ '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-5px)' } },
        bounceSubtle: { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.02)' } },
        glow:      { '0%,100%': { boxShadow: '0 0 20px rgba(34,197,94,0.3)' }, '50%': { boxShadow: '0 0 40px rgba(34,197,94,0.6)' } },
        shimmer:   { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
      },
      backgroundImage: {
        /* Dark hero matching logo navy */
        'hero':        'linear-gradient(135deg, #0f1d3d 0%, #1e3a6e 50%, #052e16 100%)',
        'hero-dark':   'linear-gradient(135deg, #0a0f1e 0%, #1e3a6e 100%)',
        'brand-grad':  'linear-gradient(135deg, #22c55e 0%, #1e3a6e 100%)',
        'green-grad':  'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        'gold-grad':   'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        'card-dark':   'linear-gradient(135deg, #1a2e5a 0%, #1e3a6e 100%)',
        'shimmer-line':'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
};
