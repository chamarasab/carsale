'use client';

import { LogIn, LogOut } from 'lucide-react';
import { signIn, signOut, useSession } from 'next-auth/react';

export function LoginButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <span className="h-9 w-24 animate-pulse rounded-panel bg-field" />;
  }

  if (session?.user) {
    return (
      <button
        className="inline-flex h-9 items-center gap-2 rounded-panel border border-line bg-surface px-3 text-sm font-bold text-foreground hover:border-signal hover:text-signal"
        onClick={() => signOut()}
        type="button"
      >
        <LogOut aria-hidden size={16} />
        Sign out
      </button>
    );
  }

  return (
    <button
      className="inline-flex h-9 items-center gap-2 rounded-panel bg-signal px-3 text-sm font-bold text-white shadow-sm hover:bg-red-700"
      onClick={() => signIn('google')}
      type="button"
    >
      <LogIn aria-hidden size={16} />
      Google login
    </button>
  );
}
