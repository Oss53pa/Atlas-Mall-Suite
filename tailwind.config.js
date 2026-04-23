/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ═══ NOUVELLE PALETTE : Anthracite + Bronze mat ═══
        // Palette refondue 2026-04-22 — abandon du noir pur + violet
        // pour un ton plus sobre et "premium industrial".
        atlas: {
          // Bronze mat doré — remplace l'ancien "atlas" bleu-violet
          50:  '#faf6ef',
          100: '#f0e6d0',
          200: '#e2ccaa',
          300: '#d4b280',
          400: '#c9a068',  // bronze clair
          500: '#b38a5a',  // bronze moyen (principal)
          600: '#9a744b',
          700: '#7e5e3c',
          800: '#624830',
          900: '#4a3626',
          950: '#2a1f16',
        },
        surface: {
          // Anthracite éclairci — VRAI gris, pas noir
          0: '#2a2d33',   // fond principal (gris anthracite)
          1: '#32353c',   // panneaux (un cran plus clair)
          2: '#3a3d44',   // cards
          3: '#44474f',   // cards élevées
          4: '#4d5059',   // hover / actif
          5: '#5a5d66',   // séparateurs
        },
        // Alias pour migration progressive — bronze.* = doré mat
        bronze: {
          light:  '#d4b280',
          DEFAULT:'#b38a5a',
          dark:   '#7e5e3c',
          muted:  '#a77d4c',
          accent: '#c9a068',
        },
        // Anthracite semantic (éclairci 2026-04-22)
        anthracite: {
          light:  '#4d5059',
          DEFAULT:'#3a3d44',
          dark:   '#2a2d33',
          deep:   '#202329',
        },
      },
      fontFamily: {
        sans: ['"Exo 2"', 'InterVar', 'system-ui', 'sans-serif'],
        display: ['"Exo 2"', 'Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        wordmark: ['"Grand Hotel"', 'cursive'],
      },
      boxShadow: {
        'glow-bronze': '0 0 20px rgba(201, 160, 104, 0.15)',
        'glow-blue':   '0 0 20px rgba(56, 189, 248, 0.15)',
        'glow-purple': '0 0 20px rgba(168, 85, 247, 0.15)',
        'glow-emerald':'0 0 20px rgba(52, 211, 153, 0.15)',
        'card':        '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.25)',
        'card-hover':  '0 10px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.35)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s infinite',
      },
      keyframes: {
        fadeIn:        { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:       { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight:  { '0%': { opacity: '0', transform: 'translateX(12px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        pulseGlow:     { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
