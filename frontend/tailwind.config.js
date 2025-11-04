/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
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
        },
        'figma': {
          primary: '#0E3C32',      // 深綠色（導航主色）
          accent: '#01E083',       // 亮綠色（hover、進度條）
          gray: '#F5F5F5',         // 背景灰色
          darkGreen: '#2B5F5A',    // Modal 深綠背景（已提交）
          lightBlue: '#A0C4C0',    // Modal 淺藍背景（已通過）
          yellowGreen: '#D4E157'   // Modal 黃綠背景（已退回）
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans TC', 'sans-serif']
      }
    },
  },
  plugins: [],
}