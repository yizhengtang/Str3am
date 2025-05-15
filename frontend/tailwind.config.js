/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          900: '#121212',
          800: '#1e1e24',
          700: '#2d2d39',
          600: '#3c3c4c',
          500: '#4c4c5f',
          400: '#9ca3af',
          300: '#d1d5db',
          200: '#e5e7eb',
          100: '#f3f4f6',
        },
        indigo: {
          700: '#4338ca',
          600: '#4f46e5',
          500: '#6366f1',
          400: '#818cf8',
        },
      },
    },
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      {
        cinema: {
          primary: '#0EA5E9',    // bright accent
          secondary: '#1E40AF',  // deep indigo
          accent: '#22D3EE',     // cyan accent
          neutral: '#1F2026',    // dark background
          'base-100': '#1F2026', // darker canvas
          'base-200': '#15171C',
          'base-300': '#0B0E13',
          'base-content': '#E5E7EB', // light text
          info: '#0EA5E9',
          success: '#10B981',
          warning: '#FACC15',
          error: '#F87171'
        }
      }
    ],
  },
} 