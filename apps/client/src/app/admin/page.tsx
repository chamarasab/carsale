'use client';

import { BadgeJapaneseYen, CarFront, ClipboardCheck, DatabaseZap, Settings, UserPlus, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Nav } from '@/components/nav';

export default function AdminPanelPage() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user.role === 'ADMIN';

  return (
    <main className="min-h-screen">
      <Nav />
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-xs font-black uppercase tracking-wide text-signal">Control panel</p>
        <h1 className="mt-2 text-4xl font-black text-foreground">
          {isAdmin ? 'Administration' : 'Publisher workspace'}
        </h1>
        <p className="mt-3 text-sub">
          {status === 'authenticated'
            ? `Signed in as ${session.user.name ?? session.user.email}.`
            : 'Sign in to publish and manage advertisements.'}
        </p>

        {status !== 'authenticated' ? (
          <Link className="bg-brand-gradient mt-6 inline-flex rounded-panel px-5 py-3 font-black text-white" href="/login">
            Login
          </Link>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <PanelLink href="/admin/vehicles" icon={CarFront} title="Advertisements" text="Create a complete vehicle advertisement and upload optimized images." />
            {isAdmin ? <PanelLink href="/admin/approvals" icon={ClipboardCheck} title="Pending approvals" text="Review and approve newly submitted advertisements before publication." /> : null}
            {isAdmin ? <PanelLink href="/admin/scraper" icon={DatabaseZap} title="JP Center scraper" text="Run imports and inspect scheduled fetch results." /> : null}
            {isAdmin ? <PanelLink href="/admin/users" icon={UserPlus} title="Create user" text="Create publisher accounts and assign their login details." /> : null}
            {isAdmin ? <PanelLink href="/admin/users" icon={Users} title="Manage users" text="Activate or deactivate publisher accounts." /> : null}
            {isAdmin ? <PanelLink href="/admin/settings" icon={Settings} title="Tax settings" text="Update tax defaults and recalculate advertisements." /> : null}
            {isAdmin ? <PanelLink href="/admin/website-values" icon={BadgeJapaneseYen} title="Manufacturer prices" text="Manage official model and grade prices used for customs valuation." /> : null}
          </div>
        )}
      </section>
    </main>
  );
}

function PanelLink({
  href,
  icon: Icon,
  title,
  text,
}: {
  href: string;
  icon: typeof CarFront;
  title: string;
  text: string;
}) {
  return (
    <Link className="rounded-panel border border-line bg-surface p-5 shadow-soft transition hover:border-signal/50" href={href}>
      <Icon className="text-signal" size={24} />
      <h2 className="mt-4 text-xl font-black text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
    </Link>
  );
}
