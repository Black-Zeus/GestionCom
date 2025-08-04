/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',

  theme: {
    extend: {
      // ====================================
      // PALETA DE COLORES PROFESIONAL 2025 - MEJORADA
      // ====================================
      colors: {
        // === COLORES PRIMARIOS Y DE MARCA ===
        primary: {
          50: '#dbeafe',
          100: '#bfdbfe',
          200: '#93c5fd',
          300: '#60a5fa',
          400: '#3b82f6',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#1e3a8a',
          DEFAULT: '#2563eb',
          // Versiones más cálidas
          light: '#f0f4ff',
          dark: '#1e293b'
        },

        // === COLOR CÁLIDO PARA ALMA ===
        warm: {
          50: '#fefcfb',
          100: '#fef7f0',
          200: '#feeee0',
          300: '#fde1c7',
          400: '#fbcb9a',
          500: '#f7b16d', // Naranja cálido principal
          600: '#e89547',
          700: '#d4772b',
          800: '#b8651e',
          900: '#9a5419',
          DEFAULT: '#f7b16d'
        },

        // === AZUL CÁLIDO ALTERNATIVO ===
        'primary-warm': {
          50: '#f0f4ff',
          100: '#e5edff',
          200: '#d0ddff',
          300: '#a6c1ff',
          400: '#7c9eff',
          500: '#4f7cff', // Azul más cálido
          600: '#3d6ae8',
          700: '#2c52cc',
          800: '#1e3a8a',
          900: '#1e293b',
          DEFAULT: '#4f7cff'
        },

        // === COLORES SECUNDARIOS (SLATE MEJORADOS) ===
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          DEFAULT: '#334155'
        },

        // === COLORES DE ESTADO MEJORADOS ===
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
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
          500: '#f59e0b',
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
          600: '#b91c1c',
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
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          DEFAULT: '#0891b2'
        },

        // === COLORES SEMÁNTICOS PARA UI MEJORADOS ===
        background: {
          DEFAULT: '#ffffff',
          light: '#f8fafc',
          'ultra-light': '#fefefe',
          dark: '#0f172a',
          'card-light': '#ffffff',
          'card-dark': '#1e293b',
          secondary: {
            light: '#f1f5f9',
            dark: '#1e293b',
          },
          tertiary: {
            light: '#e2e8f0',
            dark: '#334155',
          },
          // Fondos con calidez
          warm: {
            light: '#fefcfb',
            DEFAULT: '#fef7f0'
          }
        },

        text: {
          DEFAULT: '#0f172a',
          light: '#334155',
          'ultra-light': '#64748b',
          dark: '#f1f5f9',
          secondary: {
            light: '#64748b',
            dark: '#94a3b8',
          },
          muted: {
            light: '#94a3b8',
            dark: '#64748b',
          },
          inverse: '#ffffff',
          // Texto con calidez
          warm: '#b8651e'
        },

        border: {
          DEFAULT: '#e2e8f0',
          light: '#f1f5f9',
          'ultra-light': '#f8fafc',
          dark: '#334155',
          strong: {
            light: '#cbd5e1',
            dark: '#475569',
          },
          // Bordes con calidez
          warm: {
            light: '#feeee0',
            DEFAULT: '#fde1c7'
          }
        },

        // === COLORES ESPECÍFICOS PARA COMPONENTES MEJORADOS ===
        sidebar: {
          light: {
            bg: 'linear-gradient(180deg, #334155 0%, #475569 100%)',
            text: 'rgba(241, 245, 249, 0.95)',
            hover: 'rgba(241, 245, 249, 0.1)',
            active: 'rgba(79, 124, 255, 0.2)', // Usando primary-warm
            border: 'rgba(241, 245, 249, 0.1)'
          },
          dark: {
            bg: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
            text: 'rgba(241, 245, 249, 0.95)',
            hover: 'rgba(241, 245, 249, 0.15)',
            active: 'rgba(79, 124, 255, 0.3)',
            border: 'rgba(241, 245, 249, 0.15)'
          }
        },

        // === COLORES PARA GRÁFICOS Y CHARTS MEJORADOS ===
        chart: {
          1: '#4f7cff',   // Primary warm blue
          2: '#16a34a',   // Success green
          3: '#f7b16d',   // Warm orange
          4: '#dc2626',   // Danger red
          5: '#0891b2',   // Info cyan
          6: '#7c3aed',   // Purple
          7: '#db2777',   // Pink
          8: '#059669',   // Emerald
        }
      },

      // ====================================
      // TIPOGRAFÍA PROFESIONAL MEJORADA
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
          'sans-serif'
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          'Consolas',
          '"Liberation Mono"',
          'Menlo',
          'Courier',
          'monospace'
        ],
        display: [
          'Inter',
          'system-ui',
          'sans-serif'
        ]
      },

      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.2rem', letterSpacing: '0.05em' }],
        'sm': ['0.875rem', { lineHeight: '1.4rem', letterSpacing: '0.025em' }],
        'base': ['1rem', { lineHeight: '1.6rem', letterSpacing: '0' }],
        'lg': ['1.125rem', { lineHeight: '1.8rem', letterSpacing: '-0.025em' }],
        'xl': ['1.25rem', { lineHeight: '1.9rem', letterSpacing: '-0.025em' }],
        '2xl': ['1.5rem', { lineHeight: '2.2rem', letterSpacing: '-0.025em' }],
        '3xl': ['1.875rem', { lineHeight: '2.5rem', letterSpacing: '-0.05em' }],
        '4xl': ['2.25rem', { lineHeight: '2.8rem', letterSpacing: '-0.05em' }],
        '5xl': ['3rem', { lineHeight: '3.2rem', letterSpacing: '-0.075em' }],
        '6xl': ['3.75rem', { lineHeight: '4rem', letterSpacing: '-0.075em' }],
        '7xl': ['4.5rem', { lineHeight: '5rem', letterSpacing: '-0.1em' }],
        '8xl': ['6rem', { lineHeight: '6.5rem', letterSpacing: '-0.1em' }],
        '9xl': ['8rem', { lineHeight: '8.5rem', letterSpacing: '-0.125em' }],
      },

      // ====================================
      // ESPACIADO MEJORADO CON RITMO NATURAL
      // ====================================
      spacing: {
        '15': '3.75rem',   // 60px - respiración
        '18': '4.5rem',    // 72px
        '21': '5.25rem',   // 84px - ritmo natural
        '22': '5.5rem',    // 88px
        '26': '6.5rem',    // 104px
        '27': '6.75rem',   // 108px
        '30': '7.5rem',    // 120px
        '34': '8.5rem',    // 136px
        '38': '9.5rem',    // 152px
        '42': '10.5rem',   // 168px
        '46': '11.5rem',   // 184px
        '50': '12.5rem',   // 200px

        // Espaciados semánticos
        'sidebar-width': '280px',     // Más ancho para mejor UX
        'sidebar-collapsed': '80px',  // Más generoso
        'header-height': '64px',      // Más alto para mejor proporción
        'footer-height': '48px',      // Más generoso
        'container-padding': '1.5rem' // Padding consistente
      },

      // ====================================
      // BORDER RADIUS MÁS SUAVE
      // ====================================
      borderRadius: {
        'none': '0px',
        'xs': '0.125rem',   // 2px
        'sm': '0.375rem',   // 6px - más suave
        'DEFAULT': '0.5rem', // 8px - default más suave
        'md': '0.75rem',    // 12px
        'lg': '1rem',       // 16px
        'xl': '1.25rem',    // 20px
        '2xl': '1.5rem',    // 24px - más generoso
        '3xl': '2rem',      // 32px
        '4xl': '2.5rem',    // 40px
        'full': '9999px'
      },

      // ====================================
      // SOMBRAS PROFESIONALES MEJORADAS
      // ====================================
      boxShadow: {
        // Sombras sutiles mejoradas
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',

        // Sombras específicas con calidez
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)',
        'warm': '0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04)',
        'gentle': '0 8px 24px rgba(0, 0, 0, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04)',
        'subtle': '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',

        // Sombras específicas para componentes
        'card': '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 8px 25px rgba(0, 0, 0, 0.08), 0 4px 10px rgba(0, 0, 0, 0.04)',
        'dropdown': '0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05)',
        'modal': '0 25px 50px rgba(0, 0, 0, 0.15), 0 12px 25px rgba(0, 0, 0, 0.08)',
        'button': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
        'button-hover': '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',

        // Sombras con color para elementos especiales
        'primary': '0 4px 12px rgba(79, 124, 255, 0.15), 0 2px 4px rgba(79, 124, 255, 0.08)',
        'warm-glow': '0 4px 12px rgba(247, 177, 109, 0.15), 0 2px 4px rgba(247, 177, 109, 0.08)',
        'success': '0 4px 12px rgba(34, 197, 94, 0.15), 0 2px 4px rgba(34, 197, 94, 0.08)',

        // Sombras inner mejoradas
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.03)',
        'inner-lg': 'inset 0 4px 8px 0 rgba(0, 0, 0, 0.05)',
        'none': 'none'
      },

      // ====================================
      // TRANSICIONES Y ANIMACIONES MEJORADAS
      // ====================================
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'smooth-in': 'cubic-bezier(0.4, 0, 1, 1)',
        'smooth-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'smooth-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'natural': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'gentle': 'cubic-bezier(0.25, 0.1, 0.25, 1)'
      },

      transitionDuration: {
        '50': '50ms',
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
        '600': '600ms',
        '700': '700ms',
        '800': '800ms',
        '1000': '1000ms'
      },

      // ====================================
      // ANIMACIONES MEJORADAS CON ALMA
      // ====================================
      animation: {
        // Animaciones sutiles con calidez
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-out': 'fadeOut 0.3s ease-in',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-in-left': 'slideInLeft 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-in-up': 'slideInUp 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-in-down': 'slideInDown 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'scale-out': 'scaleOut 0.2s ease-in',

        // Animaciones con personalidad
        'hover-lift': 'hoverLift 0.2s ease-out',
        'gentle-bounce': 'gentleBounce 0.6s ease-out',
        'breathe': 'breathe 4s ease-in-out infinite',
        'gentle-pulse': 'gentlePulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',

        // Animaciones específicas mejoradas
        'sidebar-slide': 'sidebarSlide 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'dropdown-enter': 'dropdownEnter 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'dropdown-exit': 'dropdownExit 0.2s ease-in',
        'modal-enter': 'modalEnter 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'modal-exit': 'modalExit 0.3s ease-in',
        'toast-enter': 'toastEnter 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'toast-exit': 'toastExit 0.3s ease-in',

        // Animaciones de carga mejoradas
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',

        // Para Login
        'slideInUp': 'slideInUp 0.6s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'float-reverse': 'float 8s ease-in-out infinite reverse',
        'shimmer': 'shimmer 4s ease-in-out infinite',
      },

      keyframes: {
        // Keyframes básicos mejorados
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeOut: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-4px)' }
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        slideInUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideInDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' }
        },

        // Keyframes con personalidad
        hoverLift: {
          '0%': { transform: 'translateY(0px)' },
          '100%': { transform: 'translateY(-2px)' }
        },
        gentleBounce: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-4px)' },
          '60%': { transform: 'translateY(-2px)' }
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.02)', opacity: '0.9' }
        },
        gentlePulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },

        // Keyframes específicos mejorados
        sidebarSlide: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        dropdownEnter: {
          '0%': { transform: 'translateY(-8px) scale(0.98)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' }
        },
        dropdownExit: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-8px) scale(0.98)', opacity: '0' }
        },
        modalEnter: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        modalExit: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' }
        },
        toastEnter: {
          '0%': { transform: 'translateX(100%) scale(0.9)', opacity: '0' },
          '100%': { transform: 'translateX(0) scale(1)', opacity: '1' }
        },
        toastExit: {
          '0%': { transform: 'translateX(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateX(100%) scale(0.9)', opacity: '0' }
        },

        // KeyFrame Login
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(180deg)' }
        },
        shimmer: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(180deg)' }
        }
      },

      // ====================================
      // Z-INDEX SYSTEM MEJORADO
      // ====================================
      zIndex: {
        '0': '0',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        'auto': 'auto',
        'behind': '-1',
        'dropdown': '1000',
        'sticky': '1010',
        'fixed': '1020',
        'overlay': '1025',
        'modal-backdrop': '1030',
        'modal': '1040',
        'popover': '1050',
        'tooltip': '1060',
        'notification': '1070',
        'max': '9999'
      },

      // ====================================
      // BREAKPOINTS MEJORADOS
      // ====================================
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
        '4xl': '2560px',

        // Breakpoints para altura
        'h-sm': { 'raw': '(min-height: 640px)' },
        'h-md': { 'raw': '(min-height: 768px)' },
        'h-lg': { 'raw': '(min-height: 1024px)' },
        'h-xl': { 'raw': '(min-height: 1280px)' },

        // Breakpoints específicos
        'sidebar-collapse': '768px',
        'dashboard-wide': '1440px',
        'container-max': '1400px'
      },

      width: {
        '70': '17.5rem', // 280px para sidebar
        '4.5': '1.125rem', // Para switch thumb
      },
      minWidth: {
        '70': '17.5rem', // 280px para sidebar  
      },
      lineHeight: {
        '1.2': '1.2',
        '1.4': '1.4',
      },
      maxWidth: {
        '30': '7.5rem', // Para texto truncado
      },
      translate: {
        '0.5': '0.125rem', // Para micro-movimientos
      }
    }
  },

  // ====================================
  // PLUGINS Y UTILIDADES MEJORADAS
  // ====================================
  plugins: [
    function ({ addUtilities, theme }) {
      const newUtilities = {
        // === UTILIDADES DE TEXTO MEJORADAS ===
        '.text-balance': {
          'text-wrap': 'balance'
        },
        '.text-pretty': {
          'text-wrap': 'pretty'
        },
        '.text-shadow-sm': {
          'text-shadow': '0 1px 2px rgba(0, 0, 0, 0.04)'
        },
        '.text-shadow': {
          'text-shadow': '0 2px 4px rgba(0, 0, 0, 0.06)'
        },
        '.text-shadow-lg': {
          'text-shadow': '0 4px 8px rgba(0, 0, 0, 0.08)'
        },

        // === UTILIDADES DE TRANSICIÓN MEJORADAS ===
        '.transition-smooth': {
          'transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        },
        '.transition-gentle': {
          'transition': 'all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)'
        },
        '.transition-natural': {
          'transition': 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        },
        '.transition-bounce': {
          'transition': 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        },

        // === UTILIDADES DE HOVER CON ALMA ===
        '.hover-lift': {
          'transition': 'all 0.2s ease-out',
          '&:hover': {
            'transform': 'translateY(-2px)',
            'box-shadow': '0 8px 25px rgba(0, 0, 0, 0.08), 0 4px 10px rgba(0, 0, 0, 0.04)'
          }
        },
        '.hover-glow': {
          'transition': 'all 0.3s ease-out',
          '&:hover': {
            'box-shadow': '0 0 20px rgba(79, 124, 255, 0.3)',
            'transform': 'scale(1.02)'
          }
        },
        '.hover-warm': {
          'transition': 'all 0.3s ease-out',
          '&:hover': {
            'box-shadow': '0 0 20px rgba(247, 177, 109, 0.3)',
            'transform': 'scale(1.02)'
          }
        },

        // === UTILIDADES DE GRADIENTES MEJORADAS ===
        '.gradient-primary': {
          'background': 'linear-gradient(135deg, #4f7cff 0%, #2563eb 100%)'
        },
        '.gradient-warm': {
          'background': 'linear-gradient(135deg, #f7b16d 0%, #e89547 100%)'
        },
        '.gradient-subtle': {
          'background': 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
        },
        '.gradient-dark': {
          'background': 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
        },

        // === UTILIDADES DE SIDEBAR MEJORADAS ===
        '.sidebar-gradient': {
          'background': 'linear-gradient(180deg, #334155 0%, #475569 100%)'
        },
        '.sidebar-gradient-dark': {
          'background': 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
        },

        // === UTILIDADES DE GLASSMORPHISM MEJORADAS ===
        '.glass': {
          'backdrop-filter': 'blur(12px)',
          'background': 'rgba(255, 255, 255, 0.08)',
          'border': '1px solid rgba(255, 255, 255, 0.12)',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.08)'
        },
        '.glass-dark': {
          'backdrop-filter': 'blur(12px)',
          'background': 'rgba(0, 0, 0, 0.08)',
          'border': '1px solid rgba(255, 255, 255, 0.08)',
          'box-shadow': '0 8px 32px rgba(0, 0, 0, 0.12)'
        },
        '.glass-warm': {
          'backdrop-filter': 'blur(12px)',
          'background': 'rgba(247, 177, 109, 0.08)',
          'border': '1px solid rgba(247, 177, 109, 0.12)',
          'box-shadow': '0 8px 32px rgba(247, 177, 109, 0.08)'
        },

        // === UTILIDADES DE SCROLL MEJORADAS ===
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          'scrollbar-color': '#cbd5e1 #f1f5f9'
        },
        '.scrollbar-none': {
          'scrollbar-width': 'none',
          '-ms-overflow-style': 'none',
          '&::-webkit-scrollbar': {
            'display': 'none'
          }
        },
        '.scrollbar-custom': {
          '&::-webkit-scrollbar': {
            'width': '8px'
          },
          '&::-webkit-scrollbar-track': {
            'background': '#f1f5f9',
            'border-radius': '4px'
          },
          '&::-webkit-scrollbar-thumb': {
            'background': '#cbd5e1',
            'border-radius': '4px',
            '&:hover': {
              'background': '#94a3b8'
            }
          }
        },

        // === UTILIDADES DE ESTADO MEJORADAS ===
        '.state-success': {
          'background-color': '#f0fdf4',
          'border-color': '#bbf7d0',
          'color': '#15803d'
        },
        '.state-warning': {
          'background-color': '#fffbeb',
          'border-color': '#fde68a',
          'color': '#d97706'
        },
        '.state-danger': {
          'background-color': '#fef2f2',
          'border-color': '#fca5a5',
          'color': '#dc2626'
        },
        '.state-info': {
          'background-color': '#ecfeff',
          'border-color': '#a5f3fc',
          'color': '#0891b2'
        },

        // === UTILIDADES DE FOCUS MEJORADAS ===
        '.focus-ring': {
          '&:focus': {
            'outline': 'none',
            'box-shadow': '0 0 0 3px rgba(79, 124, 255, 0.12)',
            'border-color': '#4f7cff'
          }
        },
        '.focus-ring-warm': {
          '&:focus': {
            'outline': 'none',
            'box-shadow': '0 0 0 3px rgba(247, 177, 109, 0.12)',
            'border-color': '#f7b16d'
          }
        },

        // === UTILIDADES DE ASPECT RATIO ===
        '.aspect-card': {
          'aspect-ratio': '4 / 3'
        },
        '.aspect-video': {
          'aspect-ratio': '16 / 9'
        },
        '.aspect-golden': {
          'aspect-ratio': '1.618 / 1'
        },

        // === UTILIDADES DE CONTENEDOR MEJORADAS ===
        '.container-padding': {
          'padding-left': '1.5rem',
          'padding-right': '1.5rem',
          '@media (min-width: 640px)': {
            'padding-left': '2rem',
            'padding-right': '2rem'
          },
          '@media (min-width: 1024px)': {
            'padding-left': '3rem',
            'padding-right': '3rem'
          }
        },

        // === UTILIDADES DE LAYOUT FLEXIBLES ===
        '.flex-center': {
          'display': 'flex',
          'align-items': 'center',
          'justify-content': 'center'
        },
        '.flex-between': {
          'display': 'flex',
          'align-items': 'center',
          'justify-content': 'space-between'
        },
        '.flex-around': {
          'display': 'flex',
          'align-items': 'center',
          'justify-content': 'space-around'
        },

        // === UTILIDADES DE SEGURIDAD VISUAL ===
        '.safe-area-top': {
          'padding-top': 'env(safe-area-inset-top)'
        },
        '.safe-area-bottom': {
          'padding-bottom': 'env(safe-area-inset-bottom)'
        },

        // === UTILIDADES DE ANIMACIÓN PERSONALIZADA ===
        '.animate-on-scroll': {
          'opacity': '0',
          'transform': 'translateY(20px)',
          'transition': 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          '&.in-view': {
            'opacity': '1',
            'transform': 'translateY(0)'
          }
        }
      }

      addUtilities(newUtilities)
    }
  ]
}