'use client';

import { CheckCircle2, Clock3 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/nav';
import { getPendingCars, setCarPublished } from '@/lib/admin-api';
import { Car } from '@/lib/types';

export default function AdvertisementApprovalsPage() {
  const { data: session, status } = useSession();
  const [cars, setCars] = useState<Car[]>([]);
  const [message, setMessage] = useState('');
  const [approvingId, setApprovingId] = useState('');
  const isAdmin = session?.user.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin || !session?.accessToken) return;
    getPendingCars(session.accessToken)
      .then(setCars)
      .catch(() => setMessage('Could not load pending advertisements.'));
  }, [isAdmin, session?.accessToken]);

  async function approve(car: Car) {
    if (!session?.accessToken) return;
    setApprovingId(car._id);
    setMessage('');
    try {
      await setCarPublished(car._id, true, session.accessToken);
      setCars((current) => current.filter((item) => item._id !== car._id));
      setMessage(`Approved and published ${car.title}.`);
    } catch {
      setMessage(`Could not approve ${car.title}.`);
    } finally {
      setApprovingId('');
    }
  }

  return (
    <main className="min-h-screen">
      <Nav />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Link className="text-sm font-black text-sub hover:text-signal" href="/admin">
          Back to admin panel
        </Link>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-signal">Admin review</p>
            <h1 className="mt-2 text-4xl font-black text-foreground">Pending advertisements</h1>
          </div>
          {isAdmin ? (
            <span className="inline-flex items-center gap-2 rounded-panel bg-field px-3 py-2 text-sm font-black text-muted">
              <Clock3 size={16} /> {cars.length} pending
            </span>
          ) : null}
        </div>

        {!isAdmin ? (
          <div className="mt-8 rounded-panel border border-line bg-surface p-6 shadow-soft">
            <p className="font-bold text-foreground">
              {status === 'loading' ? 'Checking access...' : 'Only administrators can approve advertisements.'}
            </p>
          </div>
        ) : (
          <section className="mt-8 rounded-panel border border-line bg-surface p-5 shadow-soft">
            <div className="divide-y divide-line">
              {cars.map((car) => (
                <div className="grid gap-4 py-5 md:grid-cols-[1fr_auto] md:items-center" key={car._id}>
                  <div>
                    <h2 className="text-lg font-black text-foreground">{car.title}</h2>
                    <p className="mt-1 text-sm text-muted">
                      {car.year} {car.maker} {car.model} · Submitted by {car.createdByName ?? 'Unknown publisher'}
                    </p>
                  </div>
                  <button
                    className="bg-brand-gradient inline-flex h-11 items-center justify-center gap-2 rounded-panel px-5 text-sm font-black text-white disabled:opacity-50"
                    disabled={approvingId === car._id}
                    onClick={() => approve(car)}
                    type="button"
                  >
                    <CheckCircle2 size={17} />
                    {approvingId === car._id ? 'Approving...' : 'Approve and publish'}
                  </button>
                </div>
              ))}
              {cars.length === 0 ? (
                <p className="py-8 text-center text-sm font-bold text-muted">No advertisements are waiting for approval.</p>
              ) : null}
            </div>
          </section>
        )}
        {message ? <p className="mt-4 text-sm font-bold text-sub">{message}</p> : null}
      </section>
    </main>
  );
}
