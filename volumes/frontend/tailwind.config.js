/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Activar el modo oscuro usando la clase 'dark'

  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#F7F7F8',  // Gris claro para fondo principal
          light: '#F7F7F8',  // Fondo claro
          dark: '#1E1E1E',   // Fondo oscuro para modo dark
        },
        text: {
          DEFAULT: '#333333',  // Texto principal en gris oscuro
          light: '#333333',    // Texto principal claro
          dark: '#A4A4A4',     // Texto secundario para modo dark
        },
        primary: {
          DEFAULT: '#0070F3',  // Azul brillante para elementos activos
          light: '#0070F3',    // Azul brillante en modo claro
          dark: '#005BB5',     // Azul más oscuro en modo oscuro
        },
        success: {
          DEFAULT: '#28A745',  // Verde éxito
          light: '#28A745',    // Verde éxito claro
          dark: '#218838',     // Verde más oscuro en modo dark
        },
        danger: {
          DEFAULT: '#DC3545',  // Rojo de alerta
          light: '#F5A1A6',    // Rojo más suave en modo claro
          dark: '#C92A2A',     // Rojo más oscuro en modo dark
        },
        secondary: {
          DEFAULT: '#E9E9E9',  // Gris suave para fondo secundario
          light: '#E9E9E9',    // Fondo secundario claro
          dark: '#333333',     // Fondo más oscuro en modo dark
        },
        border: {
          DEFAULT: '#CCCCCC',  // Color gris para bordes
          light: '#CCCCCC',    // Bordes grises claros
          dark: '#555555',     // Bordes más oscuros en modo dark
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'Arial', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '72': '18rem',
        '80': '20rem',
      },
      boxShadow: {
        subtle: '0 2px 4px rgba(0, 0, 0, 0.05)',
        deep: '0 4px 10px rgba(0, 0, 0, 0.2)',
        "t-md": "0 -4px 6px rgba(0, 0, 0, 0.1)", // Sombra superior mediana
      },
      borderRadius: {
        'xl': '1.25rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
