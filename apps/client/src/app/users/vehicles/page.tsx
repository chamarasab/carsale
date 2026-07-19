'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AdminVehiclesPage from '@/app/admin/vehicles/page';

export default function UserVehiclesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    if (session?.user.role === 'ADMIN') router.replace('/admin');
  }, [router, session?.user.role, status]);

  if (status === 'loading' || status === 'unauthenticated' || session?.user.role === 'ADMIN') {
    return <main className="min-h-screen bg-canvas/75" />;
  }

  return <AdminVehiclesPage />;
}
