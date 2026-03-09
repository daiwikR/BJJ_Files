/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bjj: {
          purple: '#7c3aed',
          'purple-glow': '#a855f7',
          dark: '#0a0a1a',
          card: '#12122a',
          border: '#1e1e4a',
        },
      },
      boxShadow: {
        'purple-glow': '0 0 20px rgba(168, 85, 247, 0.4)',
        'gold-glow': '0 0 20px rgba(245, 158, 11, 0.4)',
      },
    },
  },
  plugins: [],
}
