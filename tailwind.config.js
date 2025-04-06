/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf6e3',
          100: '#fcecc7',
          200: '#f9d98b',
          300: '#f6c64f',
          400: '#f3b313',
          500: '#d99e0a',
          600: '#a87d08',
          700: '#775c06',
          800: '#463b04',
          900: '#151a02',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
  ],
} 