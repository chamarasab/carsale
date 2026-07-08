import Link from 'next/link';
import { AdminLink } from './admin-link';
import { LoginButton } from './login-button';

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-jdm-panel text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img
            alt="Genuine Automobiles"
            className="h-11 w-auto max-w-[190px] object-contain sm:max-w-[240px]"
            src="/genuine-automobiles-logo-transparent.png"
          />
          <span className="hidden text-xs font-semibold text-white/55 lg:block">
            日本車 · Your Japan-to-Sri Lanka car journey
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link className="hidden text-sm font-black text-white/65 hover:text-white sm:inline" href="/dashboard">
            Cars
          </Link>
          <AdminLink />
          <LoginButton />
        </nav>
      </div>
    </header>
  );
}
