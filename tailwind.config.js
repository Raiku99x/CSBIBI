/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#FADBD8',
          100: '#F5B7B1',
          200: '#F1948A',
          300: '#EC7063',
          400: '#E74C3C',
          500: '#C0392B',
          600: '#A93226',
          700: '#922B21',
          800: '#7B241C',
          900: '#641E16',
        },
        csblue: {
          50:  '#EBF5FB',
          100: '#D6EAF8',
          200: '#AED6F1',
          300: '#85C1E9',
          400: '#5DADE2',
          500: '#2E86C1',
          600: '#1A5276',
          700: '#154360',
          800: '#0E2F44',
          900: '#071828',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.05)',
        'brand': '0 4px 12px rgba(192,57,43,0.35)',
      },
    },
  },
  plugins: [],
}
