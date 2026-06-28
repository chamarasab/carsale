import { ArrowRight, Calculator, FileCheck2, Ship } from 'lucide-react';
import Link from 'next/link';
import { CarCard } from '@/components/car-card';
import { HeroSlider } from '@/components/hero-slider';
import { Nav } from '@/components/nav';
import { SignupPendingToast } from '@/components/signup-pending-toast';
import { getCars } from '@/lib/api';
import { lkr } from '@/lib/format';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ signup?: string }>;
}) {
  const { signup } = await searchParams;
  const cars = await getCars();
  const featured = cars.slice(0, 3);

  return (
    <main>
      <Nav />
      {signup === 'pending' ? <SignupPendingToast /> : null}
      <section className="bg-owl-gradient relative min-h-[82vh] overflow-hidden">
        <HeroSlider />
        <div className="relative z-10 mx-auto flex min-h-[82vh] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="mb-5 inline-flex border border-white/15 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-white/84 backdrop-blur">
              2023+ Japanese cars, ordered for Sri Lanka
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-none sm:text-6xl lg:text-7xl">
              Newer Japanese cars for Sri Lankan families.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
              A car is one of life&apos;s biggest dreams. Explore practical 2023+ models from Japan with the auction
              price, shipping, taxes, clearance, and local delivery brought together before you decide.
            </p>
            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3 border-y border-white/14 py-5 text-white sm:flex">
              {[
                [String(cars.length), 'live listings'],
                ['2023+', 'newer models'],
                ['JP to LK', 'one clear path'],
              ].map(([value, label]) => (
                <div className="sm:min-w-36" key={label}>
                  <p className="text-2xl font-black">{value}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-white/58">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="bg-brand-gradient inline-flex h-12 items-center gap-2 rounded-panel px-5 text-sm font-black text-white shadow-theme hover:opacity-90"
                href="/dashboard"
              >
                Find your car <ArrowRight size={18} />
              </Link>
              {featured[0] ? (
                <Link
                  className="inline-flex h-12 items-center rounded-panel border border-white/18 bg-white px-5 text-sm font-black text-[#1d1d1f] shadow-soft hover:bg-[#f5f5f5]"
                  href={`/cars/${featured[0]._id}`}
                >
                  From {lkr(featured[0].cost.totalLkr)}
                </Link>
              ) : null}
              <Link
                className="inline-flex h-12 items-center rounded-panel border border-white/20 px-5 text-sm font-black text-white hover:border-brass"
                href="/login"
              >
                Admin / publisher login
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-jdm-panel text-white">
        <div className="mx-auto grid max-w-7xl gap-0 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
          {[
            ['Sourced in Japan', 'Newer cars are published with their auction source, grade, and key details.', FileCheck2],
            ['A clearer budget', 'Vehicle cost, shipping, taxes, clearance, and local charges are estimated together.', Calculator],
            ['Supported to handover', 'Follow one understandable path from the Japanese auction to your Sri Lankan driveway.', Ship],
          ].map(([title, text, Icon]) => (
            <div className="border-b border-white/10 py-6 lg:border-b-0 lg:border-r lg:px-8 last:lg:border-r-0" key={title as string}>
              <Icon className="mb-4 text-brass" size={26} />
              <h2 className="text-lg font-black text-white">{title as string}</h2>
              <p className="mt-2 text-sm leading-6 text-white/62">{text as string}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-signal">Latest listings</p>
            <h2 className="mt-2 text-4xl font-black leading-tight text-foreground">
              Start with the car that fits your life.
            </h2>
          </div>
          <Link className="hidden text-sm font-black text-signal hover:text-brass sm:inline" href="/dashboard">
            See all cars
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((car) => (
            <CarCard car={car} key={car._id} />
          ))}
        </div>
      </section>
    </main>
  );
}
