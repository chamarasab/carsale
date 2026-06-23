'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from './theme-provider';
import { ThemeToggle } from './theme-toggle';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        <ThemeToggle />
      </ThemeProvider>
    </SessionProvider>
  );
}
