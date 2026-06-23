'use client';

import { SessionProvider } from 'next-auth/react';
import { OwlesterAuthBackground } from './owlester-auth-background';
import { ThemeProvider } from './theme-provider';
import { ThemeToggle } from './theme-toggle';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <div className="site-shell relative isolate min-h-screen">
          <OwlesterAuthBackground />
          <div className="relative z-10 min-h-screen">{children}</div>
          <ThemeToggle />
        </div>
      </ThemeProvider>
    </SessionProvider>
  );
}
