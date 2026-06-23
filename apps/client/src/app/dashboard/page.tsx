import { CarCard } from '@/components/car-card';
import { Nav } from '@/components/nav';
import { getCars, getExchangeRate } from '@/lib/api';

const brandFilters = ['Daihatsu', 'Honda', 'Mitsubishi', 'Nissan', 'Suzuki', 'Toyota'];

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ maker?: string }> }) {
  const { maker } = await searchParams;
  const [cars, exchangeRate] = await Promise.all([getCars(), getExchangeRate()]);
  const selectedMaker = brandFilters.find((brand) => brand.toLowerCase() === maker?.toLowerCase());
  const visibleCars = selectedMaker ? cars.filter((car) => car.maker.toLowerCase() === selectedMaker.toLowerCase()) : cars;

  return (
    <main>
      <Nav />
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-wide text-signal">Dashboard</p>
          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black text-foreground">Available Japan auction cars</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Compare total landed cost, vehicle grade, mileage, and auction location before sending an inquiry.
              </p>
              {exchangeRate ? (
                <p className="mt-3 inline-flex rounded-panel border border-line bg-field px-3 py-2 text-xs font-black uppercase text-sub">
                  Daily JPY rate: 1 JPY = LKR {exchangeRate.rate.toFixed(4)} ({exchangeRate.date})
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:justify-end">
              <a
                className={`rounded-panel px-3 py-2 text-xs font-black uppercase ${selectedMaker ? 'bg-field text-sub hover:bg-surface-raised' : 'bg-jdm-panel text-white'}`}
                href="/dashboard"
              >
                All
              </a>
              {brandFilters.map((brand) => (
                <a
                  className={`rounded-panel px-3 py-2 text-xs font-black uppercase ${
                    selectedMaker === brand ? 'bg-brand-gradient text-white' : 'bg-field text-sub hover:bg-surface-raised'
                  }`}
                  href={`/dashboard?maker=${encodeURIComponent(brand)}`}
                  key={brand}
                >
                  {brand}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleCars.map((car) => (
            <CarCard car={car} key={car._id} />
          ))}
        </div>
        {visibleCars.length === 0 ? (
          <div className="rounded-panel border border-line bg-surface p-8 text-center shadow-soft">
            <p className="text-lg font-black text-foreground">No {selectedMaker} cars available right now</p>
            <p className="mt-2 text-sm text-muted">Try another brand or clear the filter.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
