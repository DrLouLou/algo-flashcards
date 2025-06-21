/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        sky: {
          DEFAULT: '#3AAFFF',
        },
        midnight: '#232946',
        lightgray: '#F5F7FA',
        accent: {
          purple: '#7061E7',
        },
      },
      borderRadius: {
        xl: '1rem', // 16px
        '2xl': '1.5rem', // 24px
        'pill': '9999px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.05)',
        'card-hover': '0 6px 24px rgba(58,175,255,0.10)',
      },
      backgroundImage: {
        'gradient-subtle': 'linear-gradient(135deg, #f5f7fa 0%, #e3f0ff 100%)',
      },
      transitionProperty: {
        'shadow-bg': 'box-shadow, background-color',
      },
      keyframes: {
        'card-pop': {
          '0%': { transform: 'scale(1)' },
          '60%': { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'card-pop': 'card-pop 0.18s cubic-bezier(.4,2,.6,1)'
      }
    },
  },
  plugins: [],
}
