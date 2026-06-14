import { ArrowRight, Calculator, FileCheck2, Ship } from 'lucide-react';
import Link from 'next/link';
import { CarCard } from '@/components/car-card';
import { HeroSlider } from '@/components/hero-slider';
import { Nav } from '@/components/nav';
import { getCars } from '@/lib/api';
import { lkr } from '@/lib/format';

export default async function Home() {
  const cars = await getCars();
  const featured = cars.slice(0, 3);

  return (
    <main>
      <Nav />
      <section className="relative min-h-[82vh] overflow-hidden bg-ink">
        <HeroSlider />
        <div className="relative z-10 mx-auto flex min-h-[82vh] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="mb-5 inline-flex border border-white/15 bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-white/84 backdrop-blur">
              Supra, GT-R and JDM auction ordering for Sri Lanka
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-none sm:text-6xl lg:text-7xl">
              Japan auction legends, priced to your driveway.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/78">
              Browse Japanese performance icons and clean reconditioned auction cars with auction price, shipping,
              taxes, port charges, local delivery, and service fee shown before you inquire.
            </p>
            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3 border-y border-white/14 py-5 text-white sm:flex">
              {[
                ['4', 'JDM listings'],
                ['100%', 'cost clarity'],
                ['JP to LK', 'handover flow'],
              ].map(([value, label]) => (
                <div className="sm:min-w-36" key={label}>
                  <p className="text-2xl font-black">{value}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-white/58">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-12 items-center gap-2 bg-signal px-5 text-sm font-black text-white shadow-soft hover:bg-red-700"
                href="/dashboard"
              >
                View auction cars <ArrowRight size={18} />
              </Link>
              {featured[0] ? (
                <Link
                  className="inline-flex h-12 items-center border border-white/18 bg-white px-5 text-sm font-black text-ink shadow-soft hover:bg-mist"
                  href={`/cars/${featured[0]._id}`}
                >
                  From {lkr(featured[0].cost.totalLkr)}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-0 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
          {[
            ['Auction sourced', 'Cars published from Japan auction feeds with source and grade.', FileCheck2],
            ['JDM cost calculated', 'Supra, GT-R, NSX, Evo and other auction prices are converted with landing charges.', Calculator],
            ['Delivered locally', 'Shipping, clearance, local transport, and handover are visible.', Ship],
          ].map(([title, text, Icon]) => (
            <div className="border-b border-white/10 py-6 lg:border-b-0 lg:border-r lg:px-8 last:lg:border-r-0" key={title as string}>
              <Icon className="mb-4 text-signal" size={26} />
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
            <h2 className="mt-2 text-4xl font-black leading-tight text-ink">Japanese JDM cars with landed price</h2>
          </div>
          <Link className="hidden text-sm font-black text-signal hover:text-red-700 sm:inline" href="/dashboard">
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
