import { ArrowRight, Calculator, FileCheck2, Ship } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { CarCard } from '@/components/car-card';
import { CustomerHandoverCarousel } from '@/components/customer-handover-carousel';
import { HeroSlider } from '@/components/hero-slider';
import { Nav } from '@/components/nav';
import { SignupPendingToast } from '@/components/signup-pending-toast';
import { getCars } from '@/lib/api';
import { jpy } from '@/lib/format';

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
      <Nav active="home" />
      {signup === 'pending' ? <SignupPendingToast /> : null}
      <CustomerHandoverCarousel />
      <section className="bg-owl-gradient relative min-h-[64svh] overflow-hidden">
        <HeroSlider />
        <div className="relative z-10 mx-auto flex min-h-[64svh] max-w-7xl items-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="max-w-4xl text-white">
            <Image
              alt="Genuine Automobiles"
              className="mb-3 h-auto w-44 max-w-full object-contain sm:mb-4 sm:w-60 lg:w-64"
              height={259}
              priority
              sizes="(min-width: 640px) 288px, 208px"
              src="/genuine-automobiles-logo-transparent.png"
              width={605}
            />
            <p className="mb-3 inline-flex border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white/84 backdrop-blur sm:py-2 sm:text-xs">
              Genuine quality, real wins
            </p>
            <h1 className="max-w-4xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              Japanese cars sourced with confidence for Sri Lanka.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78 sm:mt-4 sm:text-base sm:leading-7">
              <span className="sm:hidden">
                Explore current 2023+ Japan auction cars with their grade, mileage, and auction price.
              </span>
              <span className="hidden sm:inline">
                A car is one of life&apos;s biggest dreams. Explore practical 2023+ models from Japan with the auction
                price, shipping, taxes, clearance, and local delivery brought together before you decide.
              </span>
            </p>
            <div className="mt-4 grid max-w-2xl grid-cols-3 gap-3 border-y border-white/14 py-3 text-white sm:mt-5 sm:flex sm:py-4">
              {[
                [String(cars.length), 'live listings'],
                ['2023+', 'newer models'],
                ['JP to LK', 'one clear path'],
              ].map(([value, label]) => (
                <div className="sm:min-w-36" key={label}>
                  <p className="text-lg font-black sm:text-2xl">{value}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/58 sm:text-xs">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 sm:mt-5 sm:gap-3">
              <Link
                className="bg-brand-gradient inline-flex h-11 items-center gap-2 rounded-panel px-4 text-sm font-black text-white shadow-theme hover:opacity-90 sm:h-12 sm:px-5"
                href="/dashboard"
              >
                Find your car <ArrowRight size={18} />
              </Link>
              {featured[0] ? (
                <Link
                  className="hidden h-12 items-center rounded-panel border border-white/18 bg-white px-5 text-sm font-black text-[#1d1d1f] shadow-soft hover:bg-[#f5f5f5] sm:inline-flex"
                  href={`/cars/${featured[0]._id}`}
                >
                  From {jpy(featured[0].cost.auctionPriceJpy)}
                </Link>
              ) : null}
              <Link
                className="inline-flex h-11 items-center rounded-panel border border-white/20 px-4 text-sm font-black text-white hover:border-brass sm:h-12 sm:px-5"
                href="/login"
              >
                <span className="sm:hidden">Publisher login</span>
                <span className="hidden sm:inline">Admin / publisher login</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-jdm-panel text-white">
        <div className="mx-auto grid max-w-7xl gap-0 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
          {[
            ['Sourced in Japan', 'Newer cars are published with their auction source, auction grade, and key details.', FileCheck2],
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
