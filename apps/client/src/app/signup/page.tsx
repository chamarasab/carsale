'use client';

import { UserPlus } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { signupUser } from '@/lib/admin-api';

export default function SignupPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (session?.user) {
      router.replace(session.user.role === 'ADMIN' ? '/admin' : '/users/vehicles');
    }
  }, [router, session]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    setSubmitting(true);
    setError('');

    try {
      await signupUser({
        name: String(form.get('name')),
        email,
        password,
      });
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        router.push('/login');
        return;
      }
      router.push('/users/vehicles');
      router.refresh();
    } catch {
      setError('Could not create account. Use a unique email and at least 8 characters for the password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-foreground">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-brass">Publisher access</p>
          <h1 className="mt-3 text-5xl font-black leading-tight">Create an account to submit vehicle advertisements</h1>
          <p className="mt-5 text-base leading-7 text-sub">
            New user advertisements are saved as pending requests. An administrator reviews and publishes them before
            they appear on the public cars dashboard.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link className="text-sm font-black text-sub hover:text-foreground" href="/login">
              Already have an account?
            </Link>
            <Link className="text-sm font-black text-sub hover:text-foreground" href="/home">
              Back to public site
            </Link>
          </div>
        </div>
        <form className="rounded-panel border border-white/10 bg-surface/95 p-6 text-foreground shadow-theme" onSubmit={onSubmit}>
          <h2 className="text-2xl font-black">Create publisher account</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Use this account to add vehicle advertisements for approval.</p>
          <Field label="Name" name="name" />
          <Field label="Email" name="email" type="email" />
          <Field label="Password" minLength={8} name="password" type="password" />
          <button
            className="bg-brand-gradient mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-panel px-4 text-sm font-black text-white hover:opacity-90 disabled:opacity-50"
            disabled={submitting}
            type="submit"
          >
            <UserPlus size={18} />
            {submitting ? 'Creating account...' : 'Sign up'}
          </button>
          {error ? <p className="mt-4 text-sm font-bold text-red-500">{error}</p> : null}
        </form>
      </div>
    </main>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <label className="mt-4 grid gap-2 text-sm font-bold text-sub">
      {label}
      <input className="h-12 rounded-panel border border-line bg-field px-4 focus:border-signal focus:ring-signal/15" required {...inputProps} />
    </label>
  );
}
