/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#10B981',
          'green-hover': '#059669',
          'green-soft': '#ECFDF5',
          navy: '#0D1B36',
          'navy-light': '#1E3A5F',
          blue: '#2563EB',
          'blue-soft': '#EFF6FF',
          amber: '#D97706',
          'amber-soft': '#FEF3C7',
          slate: '#F8FAFC',
          border: '#E2E8F0',
          ink: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
