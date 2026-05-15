/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Fira Code"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Royal Navy — refined from #1f2b7b
        navy: {
          50:  '#f0f3ff',
          100: '#d9dfff',
          200: '#b3bfff',
          300: '#8093f5',
          400: '#5b72e8',
          500: '#2e4299',
          600: '#1f2b7b',  // original brand
          700: '#162060',
          800: '#0e1540',
          900: '#080d27',
        },
        // Royal Gold — more saturated, less tan
        gold: {
          50:  '#fefbf0',
          100: '#fdf3d0',
          200: '#f9e29d',
          300: '#f4cc55',
          400: '#d4a928',
          500: '#b8891f',
          600: '#9a6e14',
          700: '#7a530e',
          dark: '#7d6339',
          DEFAULT: '#9a7c4b',
        },
        // Pearl White — warm, never sterile
        pearl: {
          0:   '#ffffff',
          50:  '#fdfcf7',
          100: '#f7f5ed',
          200: '#ece8d9',
          300: '#ddd8c4',
        },
        // Warm neutrals
        ink: {
          50:  '#f5f3ef',
          100: '#e8e4dc',
          200: '#c4bfb4',
          300: '#9a9585',
          400: '#7a7570',
          500: '#5a544e',
          600: '#3a3530',
          700: '#2a251f',
          800: '#1f1b16',
        },
        // Semantic
        success: {
          DEFAULT: '#1a7a3c',
          bg:      '#f0faf4',
          light:   '#dcfce7',
        },
        warning: {
          DEFAULT: '#c47c00',
          bg:      '#fef9ed',
          light:   '#fef3c7',
        },
        danger: {
          DEFAULT: '#c42828',
          bg:      '#fef2f2',
          light:   '#ffe4e6',
        },
        // Legacy aliases — kept so existing code that uses brand/accent/surface still compiles
        brand: {
          DEFAULT: '#1f2b7b',
          mid:     '#2e4299',
          deep:    '#162060',
        },
        accent: '#5b72e8',
        surface: {
          DEFAULT: '#fdfcf7',
          2:       '#f7f5ed',
        },
      },
      boxShadow: {
        card:    '0 1px 3px rgba(31,27,22,0.06), 0 1px 2px rgba(31,27,22,0.04)',
        'card-md': '0 4px 12px rgba(31,27,22,0.08), 0 1px 3px rgba(31,27,22,0.05)',
        'card-lg': '0 8px 24px rgba(31,27,22,0.10), 0 2px 6px rgba(31,27,22,0.06)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}
