/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,ts,tsx}', './app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#040273',
          fg: '#ffffff',
          muted: '#4a49a0',
          subtle: '#ececf5',
        },
        accent: {
          DEFAULT: '#bf0a30',
          subtle: '#fdecef',
        },
        surface: {
          DEFAULT: '#ffffff',
          raised: '#ffffff',
          sunken: '#f7f7fa',
          border: '#e6e6ee',
        },
        ink: {
          DEFAULT: '#000000',
          muted: '#5c5c6b',
          faint: '#8b8b99',
        },
      },
    },
  },
  plugins: [],
};
