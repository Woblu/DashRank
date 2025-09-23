// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  // THIS IS THE FIX: Enable class-based dark mode
  darkMode: 'class', 
  
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // This is a common font used in Geometry Dash-related content
        poppins: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}