import { RotateCcw } from 'lucide-react';
import { CarCard } from '@/components/car-card';
import { CarSearchForm } from '@/components/car-search-form';
import { Nav } from '@/components/nav';
import { getCars, getExchangeRate } from '@/lib/api';
import type { Car } from '@/lib/types';

type SearchParams = {
  maker?: string;
  model?: string;
  year?: string;
  market?: string;
  grade?: string;
};

function inventoryMarket(car: Car) {
  const location = `${car.location} ${car.source}`.toLowerCase();
  return location.includes('sri lanka') || location.includes('colombo') ? 'sri-lanka' : 'japan';
}

function gradeRank(grade: string) {
  if (grade.toUpperCase() === 'S') return 100;
  if (grade.toUpperCase() === 'A') return 99;
  if (grade.toUpperCase() === 'RA') return 2;
  if (grade.toUpperCase() === 'R') return 1;
  return Number.parseFloat(grade) || 0;
}

function isAuctionGrade(grade: string) {
  return /^(?:[0-6](?:\.5)?|S|A|R|RA)$/i.test(grade);
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = await searchParams;
  const [cars, exchangeRate] = await Promise.all([getCars(), getExchangeRate()]);
  const makers = [...new Set(cars.map((car) => car.maker).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const modelsByMaker = Object.fromEntries(
    makers.map((maker) => [
      maker,
      [...new Set(cars.filter((car) => car.maker === maker).map((car) => car.model).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    ]),
  );
  const years = [...new Set(cars.map((car) => car.year))].sort((a, b) => b - a);
  const grades = [...new Set(cars.map((car) => car.auctionGrade.trim()).filter(isAuctionGrade))].sort(
    (a, b) => gradeRank(b) - gradeRank(a),
  );
  const selectedMaker = makers.find((maker) => maker.toLowerCase() === filters.maker?.toLowerCase()) ?? '';
  const selectedModel =
    (selectedMaker
      ? modelsByMaker[selectedMaker]?.find((model) => model.toLowerCase() === filters.model?.toLowerCase())
      : undefined) ?? '';
  const selectedYear = years.includes(Number(filters.year)) ? Number(filters.year) : undefined;
  const selectedMarket = filters.market === 'japan' || filters.market === 'sri-lanka' ? filters.market : '';
  const selectedGrade = grades.find((grade) => grade.toLowerCase() === filters.grade?.toLowerCase()) ?? '';
  const visibleCars = cars.filter(
    (car) =>
      (!selectedMaker || car.maker.toLowerCase() === selectedMaker.toLowerCase()) &&
      (!selectedModel || car.model.toLowerCase() === selectedModel.toLowerCase()) &&
      (!selectedYear || car.year === selectedYear) &&
      (!selectedMarket || inventoryMarket(car) === selectedMarket) &&
      (!selectedGrade || car.auctionGrade.toLowerCase() === selectedGrade.toLowerCase()),
  );
  const hasFilters = Boolean(selectedMaker || selectedModel || selectedYear || selectedMarket || selectedGrade);

  return (
    <main>
      <Nav />
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-wide text-signal">Dashboard</p>
          <div className="mt-3">
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

            <CarSearchForm
              grades={grades}
              makers={makers}
              modelsByMaker={modelsByMaker}
              resultCount={visibleCars.length}
              selectedGrade={selectedGrade}
              selectedMaker={selectedMaker}
              selectedMarket={selectedMarket}
              selectedModel={selectedModel}
              selectedYear={selectedYear}
              years={years}
            />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-signal">{hasFilters ? 'Search results' : 'Current stock'}</p>
            <h2 className="mt-1 text-2xl font-black text-foreground">
              {visibleCars.length} {visibleCars.length === 1 ? 'vehicle' : 'vehicles'} available
            </h2>
          </div>
          {hasFilters ? (
            <a className="text-sm font-black text-signal hover:text-brass" href="/dashboard">
              View all cars
            </a>
          ) : null}
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleCars.map((car) => (
            <CarCard car={car} key={car._id} />
          ))}
        </div>
        {visibleCars.length === 0 ? (
          <div className="rounded-panel border border-line bg-surface p-8 text-center shadow-soft">
            <p className="text-lg font-black text-foreground">No cars match this search</p>
            <p className="mt-2 text-sm text-muted">Try a different year, grade, manufacturer, or vehicle location.</p>
            <a
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-panel border border-line bg-field px-4 text-sm font-black text-foreground hover:border-signal"
              href="/dashboard"
            >
              <RotateCcw size={17} />
              Clear search
            </a>
          </div>
        ) : null}
      </section>
    </main>
  );
}
