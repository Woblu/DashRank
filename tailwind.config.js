/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-bg': '#0f172a',     // Like Tailwind's slate-900
        'ui-bg': '#1e293b',          // Like Tailwind's slate-800
        'accent': '#0ea5e9',         // A bright, GD-like cyan/sky
        // [FIX] Changed text-secondary to a muted cyan
        'text-secondary': '#67e8f9', // Like Tailwind's cyan-300
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
}