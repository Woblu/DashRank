/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // ⬅️ critical fix
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
