import Link from 'next/link';
import { AdminLink } from './admin-link';
import { LoginButton } from './login-button';

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/94 text-foreground shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface shadow-sm">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-signal text-[8px] font-black text-white">CJ</span>
          </span>
          <span>
            <span className="block text-sm font-black uppercase tracking-wide text-foreground">Ceylon JDM Orders</span>
            <span className="block text-xs font-semibold text-muted">日本車 · Japan auction to Sri Lanka</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link className="hidden text-sm font-black text-sub hover:text-signal sm:inline" href="/dashboard">
            Cars
          </Link>
          <AdminLink />
          <LoginButton />
        </nav>
      </div>
    </header>
  );
}
