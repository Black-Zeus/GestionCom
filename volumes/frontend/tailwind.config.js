/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2aace0',
          dark: '#205db0',
          gradient: 'linear-gradient(90deg, #2aace0, #205db0)',
        },
        gray: {
          400: '#666666',
          500: '#4d4d4d',
        },
        background: {
          dark: '#121d43',
          light: '#e5e5e5',
        },
        negative: {
          black: '#000000',
          white: '#ffffff',
        },
      },
    },
  },
  plugins: [],
};
