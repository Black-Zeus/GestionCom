/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", // Ruta del archivo HTML
    "./src/**/*.{js,ts,jsx,tsx}", // Archivos React y JSX/TSX
  ],
  darkMode: 'class', // Activar el modo oscuro usando la clase 'dark'

  theme: {
    extend: {
      colors: {
        minimal: {
          light1: '#e6e8e3', // Color claro 1
          light2: '#d7dacf', // Color claro 2
          neutral1: '#bec3bc', // Color neutro 1
          neutral2: '#8f9a9c', // Color neutro 2
          dark1: '#65727a', // Color oscuro 1
        },
        background: {
          light: '#f8f9fa', // Fondo claro
          dark: '#121212', // Fondo oscuro (modo oscuro)
        },
        text: {
          light: '#4a4a4a', // Texto en modo claro
          dark: '#eaeaea', // Texto en modo oscuro
        },
        accent: {
          DEFAULT: '#8f9a9c', // Color de acento general
          dark: '#65727a', // Acento para modo oscuro
        },
      },
      fontFamily: {
        sans: ['"Source Sans Pro"', 'Arial', 'sans-serif'], // Fuente sans-serif
        serif: ['Merriweather', 'serif'], // Fuente serif
      },
      spacing: {
        '18': '4.5rem', // Espaciado adicional
        '72': '18rem',
        '80': '20rem',
        '96': '24rem',
      },
      boxShadow: {
        subtle: '0 2px 4px rgba(0, 0, 0, 0.05)', // Sombra ligera
        deep: '0 4px 10px rgba(0, 0, 0, 0.2)', // Sombra más profunda
      },
      borderRadius: {
        'xl': '1.25rem', // Radio adicional
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
