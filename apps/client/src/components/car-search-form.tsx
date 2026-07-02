'use client';

import { MapPin, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

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
}: CarSearchFormProps) {
  const [maker, setMaker] = useState(selectedMaker);
  const [model, setModel] = useState(selectedModel);
  const models = maker ? modelsByMaker[maker] ?? [] : [];
  const hasFilters = Boolean(maker || model || selectedYear || selectedMarket || selectedGrade);

  return (
    <form
      action="/dashboard"
      className="mt-8 rounded-panel border border-line bg-surface-raised p-4 shadow-soft sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-panel bg-jdm-panel text-white">
            <SlidersHorizontal size={19} />
          </span>
          <div>
            <h2 className="text-base font-black text-foreground">Search cars</h2>
            <p className="text-xs text-muted">Choose the details that matter to you.</p>
          </div>
        </div>
        <p className="hidden text-xs font-black uppercase text-sub sm:block">
          {resultCount} {resultCount === 1 ? 'car' : 'cars'} found
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
              <option value="japan">In Japan</option>
              <option value="sri-lanka">In Sri Lanka</option>
            </select>
          </span>
        </label>

        <label className="text-xs font-black uppercase text-sub">
          Condition
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
            Search
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
    </form>
  );
}
