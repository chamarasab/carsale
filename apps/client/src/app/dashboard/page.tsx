import { Grid2X2, List, RotateCcw } from 'lucide-react';
import { CarCard } from '@/components/car-card';
import { CarListItem } from '@/components/car-list-item';
import { CarSearchForm } from '@/components/car-search-form';
import { Nav } from '@/components/nav';
import { AUCTION_GRADES } from '@/lib/auction-grades';
import { getCars, getExchangeRate } from '@/lib/api';
import { inventoryMarket } from '@/lib/inventory-market';

type SearchParams = {
  maker?: string;
  model?: string;
  year?: string;
  market?: string;
  grade?: string;
  view?: string;
};

function gradeRank(grade: string) {
  if (grade.toUpperCase() === 'S') return 100;
  if (grade.toUpperCase() === 'RA') return 2;
  if (grade.toUpperCase() === 'R') return 1;
  return Number.parseFloat(grade) || 0;
}

function isAuctionGrade(grade: string) {
  return AUCTION_GRADES.includes(grade.toUpperCase() as (typeof AUCTION_GRADES)[number]);
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
  const selectedView = filters.view === 'list' ? 'list' : 'tile';
  const visibleCars = cars.filter(
    (car) =>
      (!selectedMaker || car.maker.toLowerCase() === selectedMaker.toLowerCase()) &&
      (!selectedModel || car.model.toLowerCase() === selectedModel.toLowerCase()) &&
      (!selectedYear || car.year === selectedYear) &&
      (!selectedMarket || inventoryMarket(car) === selectedMarket) &&
      (!selectedGrade || car.auctionGrade.toLowerCase() === selectedGrade.toLowerCase()),
  );
  const hasFilters = Boolean(selectedMaker || selectedModel || selectedYear || selectedMarket || selectedGrade);
  const marketCopy = selectedMarket === 'japan'
    ? {
        eyebrow: 'JDM auctions',
        heading: 'Cars currently in Japan',
        description: 'Compare auction grade, mileage, auction location, and the current average auction price in yen.',
      }
    : selectedMarket === 'sri-lanka'
      ? {
          eyebrow: 'Local stock',
          heading: 'Unregistered cars in Sri Lanka',
          description: 'Browse vehicles that have already been imported and are available locally.',
        }
      : {
          eyebrow: 'Vehicle inventory',
          heading: 'Japan auctions and local cars',
          description: 'Browse current Japan auction listings and unregistered vehicles already available in Sri Lanka.',
        };
  const viewHref = (view: 'tile' | 'list') => {
    const params = new URLSearchParams();
    if (selectedMaker) params.set('maker', selectedMaker);
    if (selectedModel) params.set('model', selectedModel);
    if (selectedYear) params.set('year', String(selectedYear));
    if (selectedMarket) params.set('market', selectedMarket);
    if (selectedGrade) params.set('grade', selectedGrade);
    params.set('view', view);
    return `/dashboard?${params.toString()}`;
  };

  return (
    <main>
      <Nav active={selectedMarket === 'japan' ? 'japan' : selectedMarket === 'sri-lanka' ? 'local' : undefined} />
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
          <p className="text-xs font-black uppercase tracking-wide text-signal">{marketCopy.eyebrow}</p>
          <div className="mt-2 sm:mt-3">
            <div>
              <h1 className="text-2xl font-black leading-tight text-foreground sm:text-4xl">{marketCopy.heading}</h1>
              <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-muted sm:mt-3 sm:block">
                {marketCopy.description}
              </p>
              {exchangeRate ? (
                <p className="mt-3 hidden rounded-panel border border-line bg-field px-3 py-2 text-xs font-black uppercase text-sub sm:inline-flex">
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
              selectedView={selectedView}
              selectedYear={selectedYear}
              years={years}
            />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-4 flex items-end justify-between gap-3 sm:mb-6">
          <div>
            <p className="text-xs font-black uppercase text-signal">{hasFilters ? 'Search results' : 'Current stock'}</p>
            <h2 className="mt-1 text-xl font-black text-foreground sm:text-2xl">
              {visibleCars.length} {visibleCars.length === 1 ? 'vehicle' : 'vehicles'} available
            </h2>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <div className="inline-flex rounded-panel border border-line bg-field p-1">
              <a
                aria-current={selectedView === 'tile' ? 'page' : undefined}
                className={`inline-flex h-9 items-center gap-1.5 rounded-panel px-2 text-xs font-black transition sm:h-10 sm:gap-2 sm:px-3 sm:text-sm ${
                  selectedView === 'tile' ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground'
                }`}
                href={viewHref('tile')}
              >
                <Grid2X2 size={17} />
                Tile
              </a>
              <a
                aria-current={selectedView === 'list' ? 'page' : undefined}
                className={`inline-flex h-9 items-center gap-1.5 rounded-panel px-2 text-xs font-black transition sm:h-10 sm:gap-2 sm:px-3 sm:text-sm ${
                  selectedView === 'list' ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground'
                }`}
                href={viewHref('list')}
              >
                <List size={17} />
                List
              </a>
            </div>
            {hasFilters ? (
              <a className="hidden text-sm font-black text-signal hover:text-brass sm:inline" href="/dashboard">
                View all cars
              </a>
            ) : null}
          </div>
        </div>
        {selectedView === 'list' ? (
          <div className="space-y-3 sm:space-y-4">
            {visibleCars.map((car) => (
              <CarListItem car={car} key={car._id} />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleCars.map((car) => (
              <CarCard car={car} key={car._id} />
            ))}
          </div>
        )}
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
