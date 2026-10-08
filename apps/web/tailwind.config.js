/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terracotta: {
          50: '#FDF6F3',
          100: '#F9ECE6',
          200: '#F3D4C7',
          300: '#EAB7A3',
          400: '#DD8665',
          500: '#CE643D',
          600: '#B84A29',
          700: '#9B3B1F',
          800: '#7F311A',
          900: '#682A17',
          DEFAULT: '#B84A29',
        },
      },
    },
  },
  plugins: [],
}
