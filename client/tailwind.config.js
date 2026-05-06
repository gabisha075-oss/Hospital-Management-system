/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1e40af", // Blue-800
        secondary: "#3b82f6", // Blue-500
        accent: "#60a5fa", // Blue-400
        background: "#f8fafc", // Slate-50
      }
    },
  },
  plugins: [],
}
