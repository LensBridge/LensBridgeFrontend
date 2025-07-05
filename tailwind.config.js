/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'msa': {
          'blue': '#1e40af',
          'light-blue': '#3b82f6', 
          'green': '#10b981',
        }
      }
    },
  },
}
