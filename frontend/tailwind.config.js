/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chessLight: '#f0d9b5',
        chessDark: '#b58863',
      },
    },
  },
  plugins: [],
}