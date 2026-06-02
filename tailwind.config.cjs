/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#1a1a2e',
          800: '#16213e',
          700: '#0f3460',
        },
        accent: '#e94560',
      }
    }
  },
  plugins: []
}
