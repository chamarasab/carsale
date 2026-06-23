'use client';

import { LogIn } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function LoginPage() {
  const { data: session } = useSession();

  return (
    <main className="bg-owl-gradient min-h-screen text-white">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-brass">Secure access</p>
          <h1 className="mt-3 text-5xl font-black leading-tight">Login to manage JDM orders</h1>
          <p className="mt-5 text-base leading-7 text-white/72">
            Customers can browse freely. Google login is used for saved sessions and protected owner actions such as
            importing auction cars, managing listings, and reviewing inquiries.
          </p>
          <Link className="mt-8 inline-flex text-sm font-black text-white/80 hover:text-white" href="/">
            Back to public site
          </Link>
        </div>
        <div className="rounded-panel border border-white/10 bg-surface p-6 text-foreground shadow-theme">
          <h2 className="text-2xl font-black">Google account</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {session?.user?.email ? `Signed in as ${session.user.email}` : 'Use Gmail or Google Workspace to continue.'}
          </p>
          <button
            className="bg-brand-gradient mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-panel px-4 text-sm font-black text-white hover:opacity-90"
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            type="button"
          >
            <LogIn size={18} />
            Continue with Google
          </button>
        </div>
      </div>
    </main>
  );
}
