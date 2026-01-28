/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rs: {
          red: '#AE0822',
          'red-light': '#E41939',
          maroon: '#290004',
          raspberry: '#D1707F',
        }
      }
    },
  },
  plugins: [],
}
