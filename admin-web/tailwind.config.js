/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#d32f2f',
        'brand-light': '#ff5252',
        'brand-dark': '#9a0007',
      },
    },
  },
  plugins: [],
};