/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
      },
      colors: {
        primary: {
          DEFAULT: '#2563eb', // blue-600
          hover: '#1d4ed8',   // blue-700
          light: '#dbeafe',   // blue-100
          dark: '#1e3a8a',    // blue-900
        },
        brand: {
          DEFAULT: '#0f172a', // slate-900
          light: '#1e293b',   // slate-800
          dark: '#020617',    // slate-950
        }
      }
    },
  },
  plugins: [],
}