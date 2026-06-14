import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: '#101318',
        asphalt: '#20252d',
        graphite: '#3d4652',
        signal: '#e03131',
        brass: '#c8952d',
        mist: '#eef2f5',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(16, 19, 24, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
