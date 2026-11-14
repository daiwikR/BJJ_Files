/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#060607', 900: '#0b0b0d', 850: '#101013', 800: '#15151a', 700: '#1d1d23', 600: '#2a2a32', 500: '#3b3b45' },
        bone: { DEFAULT: '#ece7dd', dim: '#bdb8ae' },
        ash: '#928e85',
        smoke: '#615e58',
        blood: { DEFAULT: '#e5202f', deep: '#9c111d', hot: '#ff4553' },
        gold: '#e3b34a',
        zone: { go: '#4ade80', smart: '#d6dd45', tone: '#ffa42b', recover: '#ff6a3d', rest: '#e5202f' },
        belt: { white: '#ece7dd', blue: '#2463eb', purple: '#8b3fd6', brown: '#8a5a2b', black: '#141416' },
        // legacy tokens used by the skill-tree components
        bjj: { dark: '#0b0b0d', card: '#101013', border: '#2a2a32' },
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'Haettenschweiler', 'sans-serif'],
        cond: ['"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'],
        sans: ['Barlow', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: { kicker: '0.22em' },
    },
  },
  plugins: [],
}
