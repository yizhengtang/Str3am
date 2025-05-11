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
        dark: {
          primary: '#4f46e5',
          secondary: '#6366f1',
          accent: '#818cf8',
          neutral: '#2d2d39',
          'base-100': '#121212',
          'base-200': '#1e1e24',
          'base-300': '#2d2d39',
        },
      },
    ],
  },
} 