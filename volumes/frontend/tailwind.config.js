/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",  // Ruta del archivo HTML
    "./src/**/*.{js,ts,jsx,tsx}", // Archivos React y JSX/TSX
  ],
  darkMode: 'class', // Activar el modo oscuro usando la clase 'dark' en el contenedor raíz

  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2aace0', // Color primario en modo claro
          dark: '#205db0',    // Color primario en modo oscuro
          gradient: 'linear-gradient(90deg, #2aace0, #205db0)', // Gradiente para primario
        },
        secondary: {
          DEFAULT: '#1b5699', // Color secundario en modo claro
          dark: '#3b84a3',    // Color secundario en modo oscuro
        },
        accent: {
          DEFAULT: '#316d9d', // Color de acento en modo claro
          dark: '#2b80c3',    // Color de acento en modo oscuro
        },
        gray: {
          400: '#666666',    // Gris claro
          500: '#4d4d4d',    // Gris medio
          600: '#333333',    // Gris oscuro
        },
        background: {
          light: '#e5e5e5',   // Fondo claro en modo claro
          dark: '#121d43',    // Fondo oscuro en modo oscuro
        },
        text: {
          light: '#505050',   // Texto claro en modo claro
          dark: '#f5f5f5',    // Texto claro en modo oscuro
        },
        negative: {
          black: '#000000',   // Negro
          white: '#ffffff',   // Blanco
        },
      },
      fontFamily: {
        sans: ['Inter', 'Arial', 'sans-serif'], // Fuente principal
        serif: ['Georgia', 'serif'], // Fuente serif opcional
      },
      spacing: {
        '128': '32rem', // Espaciado extra grande
      },
      boxShadow: {
        custom: '0 4px 6px rgba(0, 0, 0, 0.1)', // Sombra personalizada
      },
      fontSize: {
        'xs': '.75rem',   // Tamaño de fuente más pequeño
        'sm': '.875rem',  // Tamaño de fuente pequeño
        'lg': '1.125rem', // Tamaño de fuente grande
      },
    },
  },
  plugins: [],
};
