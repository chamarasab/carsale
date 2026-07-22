'use client';

import { LogIn, LogOut } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export function LoginButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <span className="h-9 w-9 animate-pulse rounded-panel bg-white/10 sm:w-24" />;
  }

  if (session?.user) {
    return (
      <button
        aria-label="Sign out"
        className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-panel border border-white/15 bg-white/5 text-sm font-bold text-white hover:border-signal sm:w-auto sm:px-3"
        onClick={() => signOut()}
        title="Sign out"
        type="button"
      >
        <LogOut aria-hidden size={16} />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    );
  }

  return (
    <Link
      aria-label="Login"
      className="bg-brand-gradient inline-flex h-9 w-9 items-center justify-center gap-2 rounded-panel text-sm font-bold text-white shadow-sm hover:opacity-90 sm:w-auto sm:px-3"
      href="/login"
      title="Login"
    >
      <LogIn aria-hidden size={16} />
      <span className="hidden sm:inline">Login</span>
    </Link>
  );
}
