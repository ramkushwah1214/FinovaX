/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fintech: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          900: '#064e3b',
          dark: '#090E17',
          card: '#101A2D',
          elevated: '#15223B',
          border: 'rgba(255, 255, 255, 0.08)',
          accent: '#14b8a6',
          sky: '#0284c7'
        }
      },
      boxShadow: {
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.4), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
        'card-light': '0 4px 20px -2px rgba(0, 0, 0, 0.05), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
        'glow-emerald': '0 0 20px -4px rgba(16, 185, 129, 0.35)',
        'glow-teal': '0 0 20px -4px rgba(20, 184, 166, 0.35)'
      }
    },
  },
  plugins: [],
}
