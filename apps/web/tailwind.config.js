/** @type {import('tailwindcss').Config} */
export default {
  // The shared package defines avatar colour classes, so Tailwind must scan it too.
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/shared/src/**/*.ts'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fff4f1', 100: '#ffe4dc', 200: '#ffc9b8', 300: '#ffa58a', 400: '#ff7a55',
          500: '#f95d36', 600: '#e6431c', 700: '#bf3414', 800: '#982c16', 900: '#7a2816',
        },
        sea: {
          50: '#effefb', 100: '#c8fff4', 200: '#91fee9', 300: '#53f5dc', 400: '#1fe0c8',
          500: '#06c4af', 600: '#019e8f', 700: '#067e74', 800: '#0a645d', 900: '#0d534d',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,.04), 0 8px 24px -8px rgba(15,23,42,.12)',
        lift: '0 2px 4px rgba(15,23,42,.06), 0 20px 40px -12px rgba(15,23,42,.25)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        'sheet-up': { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'none' } },
        pop: { '0%': { transform: 'scale(.6)' }, '60%': { transform: 'scale(1.15)' }, '100%': { transform: 'scale(1)' } },
        confetti: { '0%': { transform: 'translateY(-10vh) rotate(0)', opacity: 1 }, '100%': { transform: 'translateY(110vh) rotate(720deg)', opacity: 0.6 } },
      },
      animation: {
        'fade-up': 'fade-up .35s ease-out both',
        'sheet-up': 'sheet-up .28s cubic-bezier(.2,.8,.2,1) both',
        pop: 'pop .3s ease-out both',
      },
    },
  },
  plugins: [],
}
