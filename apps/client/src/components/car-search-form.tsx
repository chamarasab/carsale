'use client';

import { LoaderCircle, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';

type CarSearchFormProps = {
  makers: string[];
  modelsByMaker: Record<string, string[]>;
  years: number[];
  grades: string[];
  resultCount: number;
  selectedMaker: string;
  selectedModel: string;
  selectedYear?: number;
  selectedMarket: string;
  selectedGrade: string;
  selectedView?: string;
};

const fieldClass =
  'h-12 w-full rounded-panel border border-line bg-field px-3 text-sm font-bold text-foreground outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20 disabled:cursor-not-allowed disabled:opacity-55';

export function CarSearchForm({
  makers,
  modelsByMaker,
  years,
  grades,
  resultCount,
  selectedMaker,
  selectedModel,
  selectedYear,
  selectedMarket,
  selectedGrade,
  selectedView,
}: CarSearchFormProps) {
  const router = useRouter();
  const [isSearching, startSearchTransition] = useTransition();
  const [maker, setMaker] = useState(selectedMaker);
  const [model, setModel] = useState(selectedModel);
  const [mobileOpen, setMobileOpen] = useState(false);
  const models = maker ? modelsByMaker[maker] ?? [] : [];
  const hasFilters = Boolean(maker || model || selectedYear || selectedMarket || selectedGrade);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileOpen]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();

    for (const [name, value] of new FormData(event.currentTarget).entries()) {
      if (typeof value === 'string' && value.trim()) params.set(name, value.trim());
    }

    const query = params.toString();
    setMobileOpen(false);
    startSearchTransition(() => router.push(query ? `/dashboard?${query}` : '/dashboard'));
  }

  const searchFields = (mobile = false) => (
    <div className={`grid gap-4 ${mobile ? '' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
      <input name="view" type="hidden" value={selectedView === 'list' ? 'list' : 'tile'} />

      <label className="text-xs font-black uppercase text-sub">
        Manufacturer
        <select
          className={`${fieldClass} mt-2 normal-case`}
          name="maker"
          onChange={(event) => {
            setMaker(event.target.value);
            setModel('');
          }}
          value={maker}
        >
          <option value="">All manufacturers</option>
          {makers.map((makerOption) => (
            <option key={makerOption} value={makerOption}>
              {makerOption}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-black uppercase text-sub">
        Model
        <select
          className={`${fieldClass} mt-2 normal-case`}
          disabled={!maker}
          name="model"
          onChange={(event) => setModel(event.target.value)}
          value={model}
        >
          <option value="">{maker ? 'All available models' : 'Select manufacturer first'}</option>
          {models.map((modelOption) => (
            <option key={modelOption} value={modelOption}>
              {modelOption}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-black uppercase text-sub">
        Model year
        <select className={`${fieldClass} mt-2 normal-case`} defaultValue={selectedYear ?? ''} name="year">
          <option value="">Any year</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-black uppercase text-sub">
        Vehicle location
        <span className="mt-2 block">
          <select className={`${fieldClass} normal-case`} defaultValue={selectedMarket} name="market">
            <option value="">Japan &amp; Sri Lanka</option>
            <option value="japan">Japan auctions</option>
            <option value="sri-lanka">Local stock</option>
          </select>
        </span>
      </label>

      <label className="text-xs font-black uppercase text-sub">
        Auction grade
        <select className={`${fieldClass} mt-2 normal-case`} defaultValue={selectedGrade} name="grade">
          <option value="">Any auction grade</option>
          {grades.map((grade) => (
            <option key={grade} value={grade}>
              Grade {grade}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-end gap-2">
        <button
          aria-live="polite"
          className="bg-brand-gradient inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-panel px-5 text-sm font-black text-white shadow-theme hover:opacity-90 disabled:cursor-wait disabled:opacity-80"
          disabled={isSearching}
          type="submit"
        >
          {isSearching ? (
            <LoaderCircle className="animate-spin motion-reduce:animate-none" size={19} />
          ) : (
            <Search size={18} />
          )}
          {isSearching ? 'Searching...' : 'Search cars'}
        </button>
        {hasFilters ? (
          <a
            aria-label="Clear car search"
            className="grid size-12 shrink-0 place-items-center rounded-panel border border-line bg-field text-sub hover:border-signal hover:text-signal"
            href="/dashboard"
            title="Clear search"
          >
            <RotateCcw size={18} />
          </a>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <form
        action="/dashboard"
        aria-busy={isSearching}
        className="mt-8 hidden rounded-panel border border-line bg-surface-raised p-5 shadow-soft sm:block"
        onSubmit={submitSearch}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-panel bg-jdm-panel text-white">
              <SlidersHorizontal size={19} />
            </span>
            <div>
              <h2 className="text-base font-black text-foreground">Search cars</h2>
              <p className="text-xs font-bold text-muted">
                {resultCount} {resultCount === 1 ? 'car' : 'cars'} found
              </p>
            </div>
          </div>
          <p className="hidden text-xs font-black uppercase text-sub lg:block">Japan auctions and local stock</p>
        </div>
        {searchFields()}
      </form>

      <button
        aria-controls="mobile-car-search-dialog"
        aria-expanded={mobileOpen}
        aria-haspopup="dialog"
        aria-label="Search and filter cars"
        className="bg-brand-gradient mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/35 px-6 text-sm font-black text-white shadow-theme transition duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-signal/30 sm:hidden"
        onClick={() => setMobileOpen(true)}
        title="Search cars"
        type="button"
      >
        <Search size={21} strokeWidth={2.4} />
        Search cars
      </button>

      {mobileOpen
        ? createPortal(
            <div className="fixed inset-0 z-[70] sm:hidden">
              <button
                aria-label="Close car search"
                className="absolute inset-0 bg-black/55"
                onClick={() => setMobileOpen(false)}
                type="button"
              />
              <section
                aria-labelledby="mobile-car-search-title"
                aria-modal="true"
                className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-panel border-t border-line bg-surface shadow-theme"
                id="mobile-car-search-dialog"
                role="dialog"
              >
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
                  <div>
                    <h2 className="text-lg font-black text-foreground" id="mobile-car-search-title">
                      Search cars
                    </h2>
                    <p className="text-xs font-bold text-muted">
                      {resultCount} {resultCount === 1 ? 'car' : 'cars'} found
                    </p>
                  </div>
                  <button
                    aria-label="Close car search"
                    className="grid size-10 place-items-center rounded-panel border border-line bg-field text-muted"
                    onClick={() => setMobileOpen(false)}
                    title="Close"
                    type="button"
                  >
                    <X size={19} />
                  </button>
                </div>
                <form action="/dashboard" aria-busy={isSearching} className="p-4 pb-7" onSubmit={submitSearch}>
                  {searchFields(true)}
                </form>
              </section>
            </div>,
            document.body,
          )
        : null}

      {isSearching
        ? createPortal(
            <div
              aria-live="assertive"
              aria-label="Searching cars"
              className="fixed inset-0 z-[90] grid place-items-center bg-[#111a4b]/72 px-6 text-white backdrop-blur-sm"
              role="status"
            >
              <div className="flex flex-col items-center text-center">
                <span className="relative grid size-20 place-items-center" aria-hidden="true">
                  <span className="absolute inset-0 rounded-full border-4 border-white/20 border-t-[#00c4b4] animate-spin motion-reduce:animate-none" />
                  <Search size={28} strokeWidth={2.5} />
                </span>
                <p className="mt-5 text-xl font-black">Searching cars</p>
                <p className="mt-1 text-sm font-bold text-white/68">Finding the best matching vehicles...</p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
