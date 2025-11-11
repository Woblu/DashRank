/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // We use CSS variables defined in index.css
        'primary-bg': 'rgb(var(--color-primary-bg) / <alpha-value>)',
        'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
        'ui-bg': 'rgb(var(--color-ui-bg) / <alpha-value>)',
        'accent': 'rgb(var(--color-accent) / <alpha-value>)',
        'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        'text-on-ui': 'rgb(var(--color-text-on-ui) / <alpha-value>)',
        'button-bg': 'rgb(var(--color-button-bg) / <alpha-value>)',
        
        // --- THIS IS THE NEW COLOR ---
        'header-bg': 'rgb(var(--color-header-bg) / <alpha-value>)',
        'text-on-header': 'rgb(var(--color-text-on-header) / <alpha-value>)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      }
    },
  },
  plugins: [],
}