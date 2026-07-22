'use client';

import { MapPin, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState } from 'react';
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
        <span className="relative mt-2 block">
          <MapPin className="pointer-events-none absolute left-3 top-3.5 text-muted" size={17} />
          <select className={`${fieldClass} pl-10 normal-case`} defaultValue={selectedMarket} name="market">
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
          className="bg-brand-gradient inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-panel px-5 text-sm font-black text-white shadow-theme hover:opacity-90"
          type="submit"
        >
          <Search size={18} />
          Search cars
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
        className="mt-8 hidden rounded-panel border border-line bg-surface-raised p-5 shadow-soft sm:block"
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
        aria-label="Search and filter cars"
        className="bg-brand-gradient fixed bottom-[148px] right-5 z-50 grid h-[52px] w-[52px] place-items-center rounded-full border border-white/35 text-white shadow-theme transition duration-200 hover:-translate-y-1 hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-signal/30 sm:hidden"
        onClick={() => setMobileOpen(true)}
        title="Search cars"
        type="button"
      >
        <Search size={21} strokeWidth={2.4} />
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
                <form action="/dashboard" className="p-4 pb-7">
                  {searchFields(true)}
                </form>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
