import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        field: 'rgb(var(--field) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        sub: 'rgb(var(--sub) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        signal: 'rgb(var(--signal) / <alpha-value>)',
        sakura: 'rgb(var(--sakura) / <alpha-value>)',
        brass: 'rgb(var(--brass) / <alpha-value>)',
        'jdm-panel': 'rgb(var(--jdm-panel) / <alpha-value>)',
        ink: 'rgb(var(--foreground) / <alpha-value>)',
        asphalt: 'rgb(var(--sub) / <alpha-value>)',
        graphite: 'rgb(var(--muted) / <alpha-value>)',
        mist: 'rgb(var(--field) / <alpha-value>)',
      },
      boxShadow: {
        soft: '0 18px 50px rgb(var(--shadow-color) / 0.13)',
        theme: '0 14px 38px rgb(var(--shadow-color) / 0.22), 0 0 0 1px rgb(var(--signal) / 0.08)',
      },
      borderRadius: {
        panel: '8px',
      },
    },
  },
  plugins: [],
};

export default config;
