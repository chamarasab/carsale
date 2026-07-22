import { CarFront, Gavel, House } from 'lucide-react';
import Link from 'next/link';
import { AdminLink } from './admin-link';
import { LoginButton } from './login-button';

type NavSection = 'home' | 'japan' | 'local';

const inventoryLinks = [
  {
    href: '/',
    label: 'Home',
    mobileLabel: 'Home',
    section: 'home' as const,
    Icon: House,
  },
  {
    href: '/dashboard?market=japan',
    label: 'JDM Auctions',
    mobileLabel: 'Japan',
    section: 'japan' as const,
    Icon: Gavel,
  },
  {
    href: '/dashboard?market=sri-lanka',
    label: 'Local Stock',
    mobileLabel: 'Local',
    section: 'local' as const,
    Icon: CarFront,
  },
];

export function Nav({ active }: { active?: NavSection }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-jdm-panel text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img
            alt="Genuine Automobiles"
            className="h-9 w-auto max-w-[150px] object-contain sm:h-11 sm:max-w-[220px]"
            src="/genuine-automobiles-logo-transparent.png"
          />
          <span className="hidden text-xs font-semibold text-white/55 xl:block">
            日本車 · Your Japan-to-Sri Lanka car journey
          </span>
        </Link>
        <InventoryLinks active={active} className="hidden md:flex" />
        <nav className="flex shrink-0 items-center gap-2 sm:gap-4">
          <AdminLink />
          <LoginButton />
        </nav>
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-3 md:hidden">
        <InventoryLinks active={active} className="grid grid-cols-3" mobile />
      </div>
    </header>
  );
}

function InventoryLinks({
  active,
  className,
  mobile = false,
}: {
  active?: NavSection;
  className: string;
  mobile?: boolean;
}) {
  return (
    <nav
      aria-label="Vehicle inventory"
      className={`${className} gap-1 rounded-panel border border-white/10 bg-white/5 p-1`}
    >
      {inventoryLinks.map(({ href, label, mobileLabel, section, Icon }) => {
        const selected = active === section;
        return (
          <Link
            aria-current={selected ? 'page' : undefined}
            className={`inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-panel px-2 text-xs font-black transition sm:px-3 ${
              selected ? 'bg-brand-gradient text-white shadow-sm' : 'text-white/68 hover:bg-white/10 hover:text-white'
            }`}
            href={href}
            key={section}
            title={label}
          >
            <Icon aria-hidden className="shrink-0" size={15} />
            <span className="truncate">{mobile ? mobileLabel : label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
