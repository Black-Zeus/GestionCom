/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Activar modo oscuro usando la clase 'dark'
  
  theme: {
    extend: {
      // ====================================
      // PALETA DE COLORES PROFESIONAL 2025
      // ====================================
      colors: {
        // === COLORES PRIMARIOS Y DE MARCA ===
        primary: {
          50: '#dbeafe',
          100: '#bfdbfe',
          200: '#93c5fd',
          300: '#60a5fa',
          400: '#3b82f6',
          500: '#2563eb',  // Color principal
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#1e3a8a',
          DEFAULT: '#2563eb'
        },

        // === COLORES SECUNDARIOS (SLATE) ===
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',  // Color secundario principal
          800: '#1e293b',
          900: '#0f172a',
          DEFAULT: '#334155'
        },

        // === COLORES DE ESTADO ===
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',  // Verde éxito principal
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          DEFAULT: '#16a34a'
        },

        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',  // Amarillo advertencia principal
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          DEFAULT: '#f59e0b'
        },

        danger: {
          50: '#fef2f2',
          100: '#fecaca',
          200: '#fca5a5',
          300: '#f87171',
          400: '#ef4444',
          500: '#dc2626',
          600: '#b91c1c',  // Rojo peligro principal
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#7f1d1d',
          DEFAULT: '#b91c1c'
        },

        info: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',  // Cyan información principal
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          DEFAULT: '#0891b2'
        },

        // === COLORES SEMÁNTICOS PARA UI ===
        background: {
          DEFAULT: '#ffffff',     // Fondo principal claro
          light: '#f8fafc',       // Fondo claro alternativo
          dark: '#0f172a',        // Fondo principal oscuro
          secondary: {
            light: '#f1f5f9',     // Fondo secundario claro
            dark: '#1e293b',      // Fondo secundario oscuro
          },
          tertiary: {
            light: '#e2e8f0',     // Fondo terciario claro
            dark: '#334155',      // Fondo terciario oscuro
          }
        },

        text: {
          DEFAULT: '#0f172a',     // Texto principal oscuro
          light: '#334155',       // Texto claro
          dark: '#f1f5f9',        // Texto oscuro para modo dark
          secondary: {
            light: '#64748b',     // Texto secundario claro
            dark: '#94a3b8',      // Texto secundario oscuro
          },
          muted: {
            light: '#94a3b8',     // Texto deshabilitado claro
            dark: '#64748b',      // Texto deshabilitado oscuro
          },
          inverse: '#ffffff'      // Texto inverso
        },

        border: {
          DEFAULT: '#e2e8f0',     // Borde principal claro
          light: '#f1f5f9',       // Borde claro
          dark: '#334155',        // Borde principal oscuro
          strong: {
            light: '#cbd5e1',     // Borde fuerte claro
            dark: '#475569',      // Borde fuerte oscuro
          }
        },

        // === COLORES ESPECÍFICOS PARA COMPONENTES ===
        sidebar: {
          light: {
            bg: 'linear-gradient(180deg, #334155 0%, #475569 100%)',
            text: 'rgba(241, 245, 249, 0.95)',
            hover: 'rgba(241, 245, 249, 0.1)',
            active: 'rgba(37, 99, 235, 0.2)',
            border: 'rgba(241, 245, 249, 0.1)'
          },
          dark: {
            bg: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
            text: 'rgba(241, 245, 249, 0.95)',
            hover: 'rgba(241, 245, 249, 0.15)',
            active: 'rgba(37, 99, 235, 0.3)',
            border: 'rgba(241, 245, 249, 0.15)'
          }
        },

        // === COLORES NEUTROS EXTENDIDOS ===
        neutral: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b'
        },

        // === COLORES PARA GRÁFICOS Y CHARTS ===
        chart: {
          1: '#2563eb',   // Primary blue
          2: '#16a34a',   // Success green
          3: '#f59e0b',   // Warning amber
          4: '#dc2626',   // Danger red
          5: '#0891b2',   // Info cyan
          6: '#7c3aed',   // Purple
          7: '#db2777',   // Pink
          8: '#059669',   // Emerald
        }
      },

      // ====================================
      // TIPOGRAFÍA PROFESIONAL
      // ====================================
      fontFamily: {
        sans: [
          'Inter', 
          '-apple-system', 
          'BlinkMacSystemFont', 
          '"Segoe UI"', 
          'Roboto', 
          '"Helvetica Neue"', 
          'Arial', 
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"'
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          'Consolas',
          '"Liberation Mono"',
          'Menlo',
          'Courier',
          'monospace'
        ]
      },

      fontSize: {
        // Escalas tipográficas mejoradas
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },

      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900'
      },

      // ====================================
      // ESPACIADO Y DIMENSIONES
      // ====================================
      spacing: {
        // Espaciados específicos para el sistema
        '18': '4.5rem',   // 72px
        '22': '5.5rem',   // 88px
        '26': '6.5rem',   // 104px
        '30': '7.5rem',   // 120px
        '34': '8.5rem',   // 136px
        '38': '9.5rem',   // 152px
        '42': '10.5rem',  // 168px
        '46': '11.5rem',  // 184px
        '50': '12.5rem',  // 200px
        '54': '13.5rem',  // 216px
        '58': '14.5rem',  // 232px
        '62': '15.5rem',  // 248px
        '66': '16.5rem',  // 264px
        '70': '17.5rem',  // 280px
        '74': '18.5rem',  // 296px
        '78': '19.5rem',  // 312px
        '82': '20.5rem',  // 328px
        '86': '21.5rem',  // 344px
        '90': '22.5rem',  // 360px
        '94': '23.5rem',  // 376px
        '98': '24.5rem',  // 392px

        // Espaciados semánticos
        'sidebar-width': '260px',
        'sidebar-collapsed': '70px',
        'header-height': '60px',
        'footer-height': '40px'
      },

      // ====================================
      // BORDER RADIUS PROFESIONAL
      // ====================================
      borderRadius: {
        'none': '0px',
        'sm': '0.25rem',    // 4px
        'DEFAULT': '0.375rem', // 6px
        'md': '0.5rem',     // 8px
        'lg': '0.75rem',    // 12px
        'xl': '1rem',       // 16px
        '2xl': '1.25rem',   // 20px
        '3xl': '1.5rem',    // 24px
        '4xl': '2rem',      // 32px
        'full': '9999px'
      },

      // ====================================
      // SOMBRAS PROFESIONALES
      // ====================================
      boxShadow: {
        // Sombras sutiles
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        'none': 'none',

        // Sombras específicas para componentes
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'dropdown': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'button': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'button-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        
        // Sombras direccionales
        't-sm': '0 -1px 2px 0 rgba(0, 0, 0, 0.05)',
        't-md': '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
        't-lg': '0 -10px 15px -3px rgba(0, 0, 0, 0.1)',
        'b-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'b-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'b-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        'l-sm': '-1px 0 2px 0 rgba(0, 0, 0, 0.05)',
        'l-md': '-4px 0 6px -1px rgba(0, 0, 0, 0.1)',
        'r-sm': '1px 0 2px 0 rgba(0, 0, 0, 0.05)',
        'r-md': '4px 0 6px -1px rgba(0, 0, 0, 0.1)',

        // Sombras para modo oscuro
        'dark-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
        'dark-md': '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        'dark-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
      },

      // ====================================
      // TRANSICIONES Y ANIMACIONES
      // ====================================
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'smooth-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'smooth-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'smooth-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)'
      },

      transitionDuration: {
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms'
      },

      // ====================================
      // ANIMACIONES PERSONALIZADAS
      // ====================================
      animation: {
        // Animaciones sutiles
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-out': 'fadeOut 0.5s ease-in-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'slide-in-down': 'slideInDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'scale-out': 'scaleOut 0.2s ease-in',
        
        // Animaciones de carga
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 2s infinite',
        
        // Animaciones específicas para componentes
        'sidebar-slide': 'sidebarSlide 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'dropdown-enter': 'dropdownEnter 0.2s ease-out',
        'dropdown-exit': 'dropdownExit 0.15s ease-in',
        'modal-enter': 'modalEnter 0.3s ease-out',
        'modal-exit': 'modalExit 0.2s ease-in',
        'toast-enter': 'toastEnter 0.3s ease-out',
        'toast-exit': 'toastExit 0.2s ease-in'
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' }
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        slideInUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideInDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.9)', opacity: '0' }
        },
        bounceSubtle: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-2px)' },
          '60%': { transform: 'translateY(-1px)' }
        },
        sidebarSlide: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        dropdownEnter: {
          '0%': { transform: 'translateY(-10px) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' }
        },
        dropdownExit: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-10px) scale(0.95)', opacity: '0' }
        },
        modalEnter: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        modalExit: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.9)', opacity: '0' }
        },
        toastEnter: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        toastExit: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' }
        }
      },

      // ====================================
      // Z-INDEX SYSTEM
      // ====================================
      zIndex: {
        '0': '0',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        'auto': 'auto',
        'dropdown': '1000',
        'sticky': '1010',
        'fixed': '1020',
        'modal-backdrop': '1030',
        'modal': '1040',
        'popover': '1050',
        'tooltip': '1060',
        'max': '9999'
      },

      // ====================================
      // BREAKPOINTS PERSONALIZADOS
      // ====================================
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
        
        // Breakpoints para altura
        'h-sm': { 'raw': '(min-height: 640px)' },
        'h-md': { 'raw': '(min-height: 768px)' },
        'h-lg': { 'raw': '(min-height: 1024px)' },
        
        // Breakpoints específicos para el diseño
        'sidebar-collapse': '768px',
        'dashboard-wide': '1440px'
      },

      // ====================================
      // BACKDROP FILTERS
      // ====================================
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px'
      }
    }
  },

  // ====================================
  // PLUGINS Y UTILIDADES ADICIONALES
  // ====================================
  plugins: [
    // Función para agregar solo utilidades personalizadas (sin componentes)
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Utilidades para el sistema de diseño
        '.text-balance': {
          'text-wrap': 'balance'
        },
        '.text-pretty': {
          'text-wrap': 'pretty'
        },
        '.transition-smooth': {
          'transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        },
        '.transition-bounce': {
          'transition': 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        },
        
        // Utilidades específicas para tu sistema
        '.sidebar-gradient': {
          'background': 'linear-gradient(180deg, #334155 0%, #475569 100%)'
        },
        '.sidebar-gradient-dark': {
          'background': 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
        },
        
        // Utilidades para texto con sombra
        '.text-shadow-sm': {
          'text-shadow': '0 1px 2px rgba(0, 0, 0, 0.05)'
        },
        '.text-shadow': {
          'text-shadow': '0 1px 3px rgba(0, 0, 0, 0.1)'
        },
        '.text-shadow-lg': {
          'text-shadow': '0 4px 6px rgba(0, 0, 0, 0.1)'
        },
        
        // Utilidades para scroll personalizado
        '.scrollbar-thin': {
          'scrollbar-width': 'thin'
        },
        '.scrollbar-none': {
          'scrollbar-width': 'none',
          '-ms-overflow-style': 'none',
          '&::-webkit-scrollbar': {
            'display': 'none'
          }
        },
        
        // Utilidades para glassmorphism y efectos modernos
        '.glass': {
          'backdrop-filter': 'blur(10px)',
          'background': 'rgba(255, 255, 255, 0.1)',
          'border': '1px solid rgba(255, 255, 255, 0.2)'
        },
        '.glass-dark': {
          'backdrop-filter': 'blur(10px)',
          'background': 'rgba(0, 0, 0, 0.1)',
          'border': '1px solid rgba(255, 255, 255, 0.1)'
        }
      }

      addUtilities(newUtilities)
    }
  ]
}