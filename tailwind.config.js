/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // [FIX] Added your custom color palette
      colors: {
        'primary-bg': '#0f172a',     // Like Tailwind's slate-900
        'ui-bg': '#1e293b',          // Like Tailwind's slate-800
        'accent': '#0ea5e9',         // A bright, GD-like cyan/sky
        'text-secondary': '#94a3b8', // Like Tailwind's slate-400
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
}