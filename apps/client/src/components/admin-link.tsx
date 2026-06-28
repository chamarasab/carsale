'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';

export function AdminLink() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <Link
      className="hidden text-sm font-black text-white/65 hover:text-white sm:inline"
      href={session.user.role === 'ADMIN' ? '/admin' : '/users/vehicles'}
    >
      {session.user.role === 'ADMIN' ? 'Admin' : 'Publish'}
    </Link>
  );
}
