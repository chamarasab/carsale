'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { CarFront, LayoutDashboard } from 'lucide-react';

export function AdminLink() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  const isAdmin = session.user.role === 'ADMIN';
  const label = isAdmin ? 'Admin' : 'Publish';

  return (
    <Link
      aria-label={label}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-panel border border-white/15 bg-white/5 px-2.5 text-xs font-black text-white/80 transition hover:border-signal hover:text-white"
      href={isAdmin ? '/admin' : '/users/vehicles'}
      title={label}
    >
      {isAdmin ? (
        <LayoutDashboard aria-hidden="true" size={16} />
      ) : (
        <CarFront aria-hidden="true" size={16} />
      )}
      <span>{label}</span>
    </Link>
  );
}
