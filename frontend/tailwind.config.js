/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          50: '#f0f1f3',
          100: '#d1d4db',
          200: '#a3a9b7',
          300: '#757e93',
          400: '#47536f',
          500: '#1a284b',
          600: '#151f3c',
          700: '#10172d',
          800: '#0b0f1e',
          900: '#0B0F17',
          950: '#060810',
        },
        accent: {
          50: '#e6f7ff',
          100: '#b3ecff',
          200: '#80e0ff',
          300: '#4dd4ff',
          400: '#1ac8ff',
          500: '#2EA8FF',
          600: '#0080cc',
          700: '#006099',
          800: '#004066',
          900: '#002033',
        },
        'card-bg': 'rgba(18, 24, 38, 0.8)',
        'card-border': 'rgba(46, 168, 255, 0.1)',
        'card-hover': 'rgba(46, 168, 255, 0.15)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(46, 168, 255, 0.15)',
        'glow-lg': '0 0 40px rgba(46, 168, 255, 0.25)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}