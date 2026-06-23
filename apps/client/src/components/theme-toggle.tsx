'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      aria-label={label}
      aria-pressed={isDark}
      className="fixed bottom-5 right-5 z-50 grid h-[52px] w-[52px] place-items-center rounded-full border border-line bg-surface text-signal shadow-theme backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-signal/60 focus:outline-none focus:ring-4 focus:ring-signal/20 sm:bottom-6 sm:right-6 dark:bg-gradient-to-br dark:from-[#1e2340]/95 dark:to-[#172653]/95"
      onClick={toggleTheme}
      suppressHydrationWarning
      title={label}
      type="button"
    >
      {isDark ? <Sun size={21} strokeWidth={2.2} /> : <Moon size={21} strokeWidth={2.2} />}
    </button>
  );
}
