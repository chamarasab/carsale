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
        'owl-purple': 'rgb(var(--owl-purple) / <alpha-value>)',
        'owl-blue': 'rgb(var(--owl-blue) / <alpha-value>)',
        'owl-green': 'rgb(var(--owl-green) / <alpha-value>)',
        'jdm-panel': 'rgb(var(--jdm-panel) / <alpha-value>)',
        ink: 'rgb(var(--foreground) / <alpha-value>)',
        asphalt: 'rgb(var(--sub) / <alpha-value>)',
        graphite: 'rgb(var(--muted) / <alpha-value>)',
        mist: 'rgb(var(--field) / <alpha-value>)',
      },
      boxShadow: {
        soft: '0 8px 28px rgb(var(--shadow-color) / 0.12)',
        theme: '0 12px 34px rgb(var(--shadow-color) / 0.3), 0 0 28px rgb(var(--signal) / 0.2)',
      },
      borderRadius: {
        panel: '10px',
      },
    },
  },
  plugins: [],
};

export default config;
