'use client';

import { CarFront, Plus, Save, Tags } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/nav';
import {
  createCarAdvertisement,
  createVehicleCategory,
  getVehicleCategories,
  VehicleCategory,
  VehicleCategoryInput,
} from '@/lib/admin-api';

type CarForm = {
  title: string;
  maker: string;
  model: string;
  modelCode: string;
  categoryId: string;
  categoryMeaning: string;
  year: string;
  mileageKm: string;
  fuelType: string;
  transmission: string;
  auctionGrade: string;
  chassisCode: string;
  location: string;
  sourceUrl: string;
  image: string;
  features: string;
  auctionPriceJpy: string;
  exchangeRateLkr: string;
  yellowBookValueJpy: string;
  freightJpy: string;
  insuranceJpy: string;
  vehicleType: string;
  engineCapacity: string;
  depreciationRate: string;
  exciseRatePerUnitLkr: string;
  exciseDutyLkr: string;
  luxuryThresholdLkr: string;
  luxuryRate: string;
  bankChargesLkr: string;
  clearingChargesLkr: string;
  supplierCommissionLkr: string;
  importerCommissionLkr: string;
  depositLkr: string;
  localTransportLkr: string;
  status: 'available' | 'reserved' | 'sold';
  published: boolean;
};

const emptyCategory: VehicleCategoryInput = {
  code: '',
  meaning: '',
  maker: 'Suzuki',
  model: 'Wagon R',
  grades: ['Hybrid FX-S'],
  yearFrom: 2023,
  yearTo: 2026,
  bodyType: 'Kei hatchback',
  vehicleType: 'Car',
  fuelType: 'Hybrid Petrol',
  driveType: 'FF / 4WD',
  transmission: 'CVT',
  engineCapacity: 660,
  defaultDepreciationRate: 0.85,
  defaultExciseRatePerUnitLkr: 3000,
  defaultLuxuryThresholdLkr: 5500000,
  notes: '',
  active: true,
};

const initialCarForm: CarForm = {
  title: '',
  maker: '',
  model: '',
  modelCode: '',
  categoryId: '',
  categoryMeaning: '',
  year: '2021',
  mileageKm: '42000',
  fuelType: '',
  transmission: 'Automatic',
  auctionGrade: '4',
  chassisCode: '',
  location: 'USS Tokyo',
  sourceUrl: '',
  image: '/blank-car-logo.svg',
  features: 'Auction sheet verified, Japan auction listing, Transparent Sri Lanka landed cost',
  auctionPriceJpy: '950000',
  exchangeRateLkr: '2.08',
  yellowBookValueJpy: '1100000',
  freightJpy: '220000',
  insuranceJpy: '25000',
  vehicleType: 'Car',
  engineCapacity: '',
  depreciationRate: '',
  exciseRatePerUnitLkr: '',
  exciseDutyLkr: '',
  luxuryThresholdLkr: '',
  luxuryRate: '',
  bankChargesLkr: '45000',
  clearingChargesLkr: '180000',
  supplierCommissionLkr: '180000',
  importerCommissionLkr: '220000',
  depositLkr: '100000',
  localTransportLkr: '80000',
  status: 'available',
  published: true,
};

const categoryNumberFields = [
  ['engineCapacity', 'Engine cc'],
  ['defaultDepreciationRate', 'Depreciation'],
  ['defaultExciseRatePerUnitLkr', 'Excise per cc'],
  ['defaultExciseDutyLkr', 'Fixed excise'],
  ['defaultLuxuryThresholdLkr', 'Luxury threshold'],
  ['defaultLuxuryRate', 'Luxury rate'],
] as const;

const costNumberFields = [
  ['auctionPriceJpy', 'Auction price JPY'],
  ['exchangeRateLkr', 'Exchange rate'],
  ['yellowBookValueJpy', 'Yellow Book JPY'],
  ['freightJpy', 'Freight JPY'],
  ['insuranceJpy', 'Insurance JPY'],
  ['engineCapacity', 'Engine cc'],
  ['depreciationRate', 'Depreciation'],
  ['exciseRatePerUnitLkr', 'Excise per cc'],
  ['exciseDutyLkr', 'Fixed excise'],
  ['luxuryThresholdLkr', 'Luxury threshold'],
  ['luxuryRate', 'Luxury rate'],
  ['bankChargesLkr', 'Bank charges'],
  ['clearingChargesLkr', 'Clearing'],
  ['supplierCommissionLkr', 'Supplier commission'],
  ['importerCommissionLkr', 'Importer commission'],
  ['depositLkr', 'Customer deposit'],
  ['localTransportLkr', 'Local transport'],
] as const;

function optionalNumber(value: string) {
  if (value.trim() === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

const panelClass = 'rounded-panel bg-surface p-6 shadow-soft ring-1 ring-line';
const labelClass = 'grid gap-2 text-sm font-semibold text-muted';
const inputClass =
  'h-12 rounded-panel border border-line bg-field px-4 text-[15px] text-foreground outline-none transition focus:border-signal focus:bg-surface focus:ring-4 focus:ring-signal/10';
const textareaClass =
  'min-h-24 rounded-panel border border-line bg-field px-4 py-3 text-[15px] text-foreground outline-none transition focus:border-signal focus:bg-surface focus:ring-4 focus:ring-signal/10';
const primaryButtonClass =
  'bg-brand-gradient inline-flex h-12 items-center justify-center gap-2 rounded-panel px-6 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50';
const secondaryButtonClass =
  'inline-flex h-11 items-center justify-center rounded-panel bg-field px-5 text-sm font-semibold text-foreground ring-1 ring-line transition hover:bg-surface-raised hover:ring-signal/40';

export default function AdminVehiclesPage() {
  const { data: session, status } = useSession();
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [categoryForm, setCategoryForm] = useState<VehicleCategoryInput>(emptyCategory);
  const [carForm, setCarForm] = useState<CarForm>(initialCarForm);
  const [message, setMessage] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingCar, setSavingCar] = useState(false);

  useEffect(() => {
    getVehicleCategories()
      .then(setCategories)
      .catch(() => setMessage('Could not load vehicle categories.'));
  }, []);

  const activeCategories = useMemo(() => categories.filter((category) => category.active !== false), [categories]);

  function applyCategory(categoryId: string) {
    const category = categories.find((item) => item._id === categoryId);
    setCarForm((current) => {
      if (!category) {
        return { ...current, categoryId: '', modelCode: '', categoryMeaning: '' };
      }

      return {
        ...current,
        categoryId: category._id,
        categoryMeaning: category.meaning,
        maker: category.maker ?? current.maker,
        model: category.model ?? current.model,
        modelCode: category.code,
        fuelType: category.fuelType ?? current.fuelType,
        vehicleType: category.vehicleType ?? current.vehicleType,
        engineCapacity: category.engineCapacity?.toString() ?? current.engineCapacity,
        depreciationRate: category.defaultDepreciationRate?.toString() ?? current.depreciationRate,
        exciseRatePerUnitLkr: category.defaultExciseRatePerUnitLkr?.toString() ?? current.exciseRatePerUnitLkr,
        exciseDutyLkr: category.defaultExciseDutyLkr?.toString() ?? current.exciseDutyLkr,
        luxuryThresholdLkr: category.defaultLuxuryThresholdLkr?.toString() ?? current.luxuryThresholdLkr,
        luxuryRate: category.defaultLuxuryRate?.toString() ?? current.luxuryRate,
        title: current.title || `${current.year} ${category.maker ?? ''} ${category.model ?? ''} ${category.code}`.trim(),
      };
    });
  }

  async function onCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.idToken) {
      setMessage('Sign in with an admin Google account first.');
      return;
    }

    setSavingCategory(true);
    setMessage('');
    try {
      const saved = await createVehicleCategory(categoryForm, session.idToken);
      setCategories((current) => [...current.filter((category) => category._id !== saved._id), saved]);
      setCategoryForm(emptyCategory);
      setMessage(`Saved category ${saved.code}.`);
    } catch {
      setMessage('Could not save category. Check admin permission and duplicate code.');
    } finally {
      setSavingCategory(false);
    }
  }

  async function onCarSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.idToken) {
      setMessage('Sign in with an admin Google account first.');
      return;
    }

    setSavingCar(true);
    setMessage('');
    try {
      const images = carForm.image
        .split(',')
        .map((image) => image.trim())
        .filter(Boolean);

      await createCarAdvertisement(
        {
          title: carForm.title,
          maker: carForm.maker,
          model: carForm.model,
          modelCode: carForm.modelCode || undefined,
          categoryId: carForm.categoryId || undefined,
          categoryMeaning: carForm.categoryMeaning || undefined,
          year: Number(carForm.year),
          mileageKm: Number(carForm.mileageKm),
          fuelType: carForm.fuelType,
          transmission: carForm.transmission,
          auctionGrade: carForm.auctionGrade,
          chassisCode: carForm.chassisCode,
          location: carForm.location,
          source: 'Japan Auction',
          sourceUrl: carForm.sourceUrl || undefined,
          images: images.length ? images : ['/blank-car-logo.svg'],
          features: carForm.features
            .split(',')
            .map((feature) => feature.trim())
            .filter(Boolean),
          cost: {
            auctionPriceJpy: Number(carForm.auctionPriceJpy),
            exchangeRateLkr: Number(carForm.exchangeRateLkr),
            yellowBookValueJpy: optionalNumber(carForm.yellowBookValueJpy),
            freightJpy: optionalNumber(carForm.freightJpy),
            insuranceJpy: optionalNumber(carForm.insuranceJpy),
            vehicleType: carForm.vehicleType,
            fuelType: carForm.fuelType,
            engineCapacity: optionalNumber(carForm.engineCapacity),
            manufactureYear: Number(carForm.year),
            depreciationRate: optionalNumber(carForm.depreciationRate),
            exciseRatePerUnitLkr: optionalNumber(carForm.exciseRatePerUnitLkr),
            exciseDutyLkr: optionalNumber(carForm.exciseDutyLkr),
            luxuryThresholdLkr: optionalNumber(carForm.luxuryThresholdLkr),
            luxuryRate: optionalNumber(carForm.luxuryRate),
            bankChargesLkr: optionalNumber(carForm.bankChargesLkr),
            clearingChargesLkr: optionalNumber(carForm.clearingChargesLkr),
            supplierCommissionLkr: optionalNumber(carForm.supplierCommissionLkr),
            importerCommissionLkr: optionalNumber(carForm.importerCommissionLkr),
            depositLkr: optionalNumber(carForm.depositLkr),
            localTransportLkr: optionalNumber(carForm.localTransportLkr),
          },
          status: carForm.status,
          published: carForm.published,
        },
        session.idToken,
      );

      setCarForm(initialCarForm);
      setMessage('Vehicle advertisement published and landed cost calculated.');
    } catch {
      setMessage('Could not publish vehicle advertisement. Check required fields and API logs.');
    } finally {
      setSavingCar(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas/75 text-foreground dark:bg-canvas/35">
      <Nav />
      <section className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-10 pt-12 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-semibold text-signal">管理 · Admin</p>
            <h1 className="mt-2 max-w-3xl text-5xl font-semibold tracking-normal text-foreground sm:text-6xl">
              Vehicle advertisements.
            </h1>
            <p className="mt-4 max-w-3xl text-xl font-semibold leading-8 text-muted">
              Create auction listings and keep tax defaults by model code, so each JDM car gets the correct Sri Lanka
              landed-cost attributes before publishing.
            </p>
          </div>
          <Link className={secondaryButtonClass} href="/admin/settings">
            Tax settings
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[420px_1fr] lg:px-8">
        {status !== 'authenticated' ? (
          <div className={`${panelClass} lg:col-span-2`}>
            <h2 className="text-2xl font-semibold text-foreground">Admin login required</h2>
            <p className="mt-2 text-sm font-medium text-muted">Use Google login from the header before saving categories or cars.</p>
          </div>
        ) : null}

        <aside className="space-y-6">
          <form className={panelClass} onSubmit={onCategorySubmit}>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-panel bg-signal/12">
                <Tags className="text-signal" size={20} />
              </span>
              <h2 className="text-2xl font-semibold text-foreground">Model-code category</h2>
            </div>
            <div className="mt-4 grid gap-3">
              <label className={labelClass}>
                Code
                <input className={inputClass} value={categoryForm.code} onChange={(event) => setCategoryForm({ ...categoryForm, code: event.target.value })} />
              </label>
              <label className={labelClass}>
                Meaning
                <input className={inputClass} value={categoryForm.meaning} onChange={(event) => setCategoryForm({ ...categoryForm, meaning: event.target.value })} />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  Maker
                  <input className={inputClass} value={categoryForm.maker ?? ''} onChange={(event) => setCategoryForm({ ...categoryForm, maker: event.target.value })} />
                </label>
                <label className={labelClass}>
                  Model
                  <input className={inputClass} value={categoryForm.model ?? ''} onChange={(event) => setCategoryForm({ ...categoryForm, model: event.target.value })} />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  Vehicle type
                  <input className={inputClass} value={categoryForm.vehicleType ?? ''} onChange={(event) => setCategoryForm({ ...categoryForm, vehicleType: event.target.value })} />
                </label>
                <label className={labelClass}>
                  Fuel
                  <input className={inputClass} value={categoryForm.fuelType ?? ''} onChange={(event) => setCategoryForm({ ...categoryForm, fuelType: event.target.value })} />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  Year from
                  <input className={inputClass} min="1980" type="number" value={categoryForm.yearFrom ?? ''} onChange={(event) => setCategoryForm({ ...categoryForm, yearFrom: optionalNumber(event.target.value) })} />
                </label>
                <label className={labelClass}>
                  Year to
                  <input className={inputClass} min="1980" type="number" value={categoryForm.yearTo ?? ''} onChange={(event) => setCategoryForm({ ...categoryForm, yearTo: optionalNumber(event.target.value) })} />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  Body type
                  <input className={inputClass} value={categoryForm.bodyType ?? ''} onChange={(event) => setCategoryForm({ ...categoryForm, bodyType: event.target.value })} />
                </label>
                <label className={labelClass}>
                  Drive
                  <input className={inputClass} value={categoryForm.driveType ?? ''} onChange={(event) => setCategoryForm({ ...categoryForm, driveType: event.target.value })} />
                </label>
              </div>
              <label className={labelClass}>
                Grades
                <input
                  className={inputClass}
                  value={categoryForm.grades?.join(', ') ?? ''}
                  onChange={(event) =>
                    setCategoryForm({
                      ...categoryForm,
                      grades: event.target.value
                        .split(',')
                        .map((grade) => grade.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                {categoryNumberFields.map(([field, label]) => (
                  <label className={labelClass} key={field}>
                    {label}
                    <input
                      className={inputClass}
                      min="0"
                      step="0.001"
                      type="number"
                      value={categoryForm[field] ?? ''}
                      onChange={(event) => setCategoryForm({ ...categoryForm, [field]: optionalNumber(event.target.value) })}
                    />
                  </label>
                ))}
              </div>
              <label className={labelClass}>
                Notes
                <textarea className={textareaClass} value={categoryForm.notes ?? ''} onChange={(event) => setCategoryForm({ ...categoryForm, notes: event.target.value })} />
              </label>
              <button className={primaryButtonClass} disabled={savingCategory || status !== 'authenticated'} type="submit">
                <Plus size={16} />
                {savingCategory ? 'Saving...' : 'Add category'}
              </button>
            </div>
          </form>

          <div className={panelClass}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-muted">Master data</p>
                <h2 className="mt-1 text-2xl font-semibold text-foreground">Saved categories</h2>
              </div>
              <span className="rounded-panel bg-field px-3 py-1 text-xs font-semibold text-muted">{categories.length}</span>
            </div>
            <div className="mt-4 max-h-[440px] space-y-3 overflow-y-auto pr-2">
              {categories.map((category) => (
                <div className="min-h-[96px] rounded-panel bg-field p-4 ring-1 ring-line transition hover:bg-surface-raised" key={category._id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-foreground">{category.code}</p>
                    <p className="rounded-panel bg-surface px-3 py-1 text-xs font-semibold text-muted">{category.fuelType}</p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">{category.meaning}</p>
                  <p className="mt-1 text-xs font-medium text-muted">
                    {category.maker} {category.model} / {category.engineCapacity ?? '-'}cc / {category.yearFrom ?? '-'}-{category.yearTo ?? 'now'}
                  </p>
                  {category.grades?.length ? <p className="mt-2 line-clamp-2 text-xs text-muted">{category.grades.join(', ')}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <form className={panelClass} onSubmit={onCarSubmit}>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-panel bg-signal/12">
              <CarFront className="text-signal" size={22} />
            </span>
            <div>
              <p className="text-sm font-semibold text-muted">Auction listing</p>
              <h2 className="text-3xl font-semibold text-foreground">Add vehicle advertisement</h2>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className={labelClass}>
              Apply model-code category
              <select className={inputClass} value={carForm.categoryId} onChange={(event) => applyCategory(event.target.value)}>
                <option value="">Select category</option>
                {activeCategories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.code} - {category.meaning}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className={`${labelClass} md:col-span-2`}>
                Title
                <input className={inputClass} required value={carForm.title} onChange={(event) => setCarForm({ ...carForm, title: event.target.value })} />
              </label>
              <label className={labelClass}>
                Model code
                <input className={inputClass} value={carForm.modelCode} onChange={(event) => setCarForm({ ...carForm, modelCode: event.target.value.toUpperCase() })} />
              </label>
              <label className={labelClass}>
                Maker
                <input className={inputClass} required value={carForm.maker} onChange={(event) => setCarForm({ ...carForm, maker: event.target.value })} />
              </label>
              <label className={labelClass}>
                Model
                <input className={inputClass} required value={carForm.model} onChange={(event) => setCarForm({ ...carForm, model: event.target.value })} />
              </label>
              <label className={labelClass}>
                Year
                <input className={inputClass} min="1980" required type="number" value={carForm.year} onChange={(event) => setCarForm({ ...carForm, year: event.target.value })} />
              </label>
              <label className={labelClass}>
                Mileage km
                <input className={inputClass} min="0" required type="number" value={carForm.mileageKm} onChange={(event) => setCarForm({ ...carForm, mileageKm: event.target.value })} />
              </label>
              <label className={labelClass}>
                Fuel
                <input className={inputClass} required value={carForm.fuelType} onChange={(event) => setCarForm({ ...carForm, fuelType: event.target.value })} />
              </label>
              <label className={labelClass}>
                Transmission
                <input className={inputClass} required value={carForm.transmission} onChange={(event) => setCarForm({ ...carForm, transmission: event.target.value })} />
              </label>
              <label className={labelClass}>
                Auction grade
                <input className={inputClass} required value={carForm.auctionGrade} onChange={(event) => setCarForm({ ...carForm, auctionGrade: event.target.value })} />
              </label>
              <label className={labelClass}>
                Chassis code
                <input className={inputClass} required value={carForm.chassisCode} onChange={(event) => setCarForm({ ...carForm, chassisCode: event.target.value.toUpperCase() })} />
              </label>
              <label className={labelClass}>
                Auction location
                <input className={inputClass} required value={carForm.location} onChange={(event) => setCarForm({ ...carForm, location: event.target.value })} />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Image paths
                <input className={inputClass} value={carForm.image} onChange={(event) => setCarForm({ ...carForm, image: event.target.value })} />
              </label>
              <label className={labelClass}>
                Auction URL
                <input className={inputClass} value={carForm.sourceUrl} onChange={(event) => setCarForm({ ...carForm, sourceUrl: event.target.value })} />
              </label>
              <label className={`${labelClass} md:col-span-2`}>
                Features
                <input className={inputClass} value={carForm.features} onChange={(event) => setCarForm({ ...carForm, features: event.target.value })} />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {costNumberFields.map(([field, label]) => (
                <label className={labelClass} key={field}>
                  {label}
                  <input
                    className={inputClass}
                    min="0"
                    required={field === 'auctionPriceJpy' || field === 'exchangeRateLkr'}
                    step="0.001"
                    type="number"
                    value={carForm[field]}
                    onChange={(event) => setCarForm({ ...carForm, [field]: event.target.value })}
                  />
                </label>
              ))}
              <label className={labelClass}>
                Vehicle type
                <input className={inputClass} value={carForm.vehicleType} onChange={(event) => setCarForm({ ...carForm, vehicleType: event.target.value })} />
              </label>
              <label className={labelClass}>
                Status
                <select className={inputClass} value={carForm.status} onChange={(event) => setCarForm({ ...carForm, status: event.target.value as CarForm['status'] })}>
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="sold">Sold</option>
                </select>
              </label>
              <label className="flex items-center gap-3 pt-8 text-sm font-semibold text-muted">
                <input checked={carForm.published} className="h-5 w-5 accent-signal" type="checkbox" onChange={(event) => setCarForm({ ...carForm, published: event.target.checked })} />
                Published
              </label>
            </div>

            <button className={`${primaryButtonClass} md:w-fit`} disabled={savingCar || status !== 'authenticated'} type="submit">
              <Save size={16} />
              {savingCar ? 'Publishing...' : 'Publish vehicle'}
            </button>
            {message ? <p className="rounded-panel bg-field px-4 py-3 text-sm font-semibold text-foreground">{message}</p> : null}
          </div>
        </form>
      </section>
    </main>
  );
}
