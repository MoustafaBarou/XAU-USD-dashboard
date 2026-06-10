/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        bg: '#05070A',
        bg2: '#0A0E13',
        panel: '#0D1218',
        gold: '#D4AF37',
        goldBright: '#FFD700',
        goldSoft: '#E6C65B',
        goldDark: '#A77A00',
        cyan: '#00E5FF',
        aiblue: '#4CC9F0',
        bull: '#00D98B',
        bear: '#FF4D6D',
        warn: '#FFC857',
        green: '#22C55E',
        greenBright: '#4ADE80',
        greenSoft: '#86EFAC',
        greenDark: '#15803D',
        txt: '#FFFFFF',
        txt2: '#C5CCD8',
        muted: '#8A93A6',
      },
      boxShadow: {
        goldglow: '0 0 40px rgba(212,175,55,0.18)',
        panel: '0 8px 40px rgba(0,0,0,0.45)',
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
