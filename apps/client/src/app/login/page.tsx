'use client';

import { LogIn } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session?.user) router.replace('/admin');
  }, [router, session]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError('');
    const result = await signIn('credentials', {
      email: String(form.get('email')),
      password: String(form.get('password')),
      redirect: false,
    });
    setSubmitting(false);
    if (result?.error) {
      setError('Invalid credentials or this account is inactive.');
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-foreground">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-brass">Secure access</p>
          <h1 className="mt-3 text-5xl font-black leading-tight">Manage and publish JDM advertisements</h1>
          <p className="mt-5 text-base leading-7 text-sub">
            Administrators manage accounts and settings. Active publishers can create and manage their own vehicle
            advertisements.
          </p>
          <Link className="mt-8 inline-flex text-sm font-black text-sub hover:text-foreground" href="/">
            Back to public site
          </Link>
        </div>
        <form className="rounded-panel border border-white/10 bg-surface/95 p-6 text-foreground shadow-theme" onSubmit={onSubmit}>
          <h2 className="text-2xl font-black">Account login</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Use the email and password assigned by the administrator.</p>
          <label className="mt-6 grid gap-2 text-sm font-bold text-sub">
            Email
            <input className="h-12 rounded-panel border border-line bg-field px-4 focus:border-signal focus:ring-signal/15" name="email" required type="email" />
          </label>
          <label className="mt-4 grid gap-2 text-sm font-bold text-sub">
            Password
            <input className="h-12 rounded-panel border border-line bg-field px-4 focus:border-signal focus:ring-signal/15" minLength={8} name="password" required type="password" />
          </label>
          <button
            className="bg-brand-gradient mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-panel px-4 text-sm font-black text-white hover:opacity-90 disabled:opacity-50"
            disabled={submitting}
            type="submit"
          >
            <LogIn size={18} />
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
          {error ? <p className="mt-4 text-sm font-bold text-red-500">{error}</p> : null}
          <p className="mt-5 text-center text-sm font-bold text-muted">
            New publisher?{' '}
            <Link className="text-signal hover:text-foreground" href="/signup">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
