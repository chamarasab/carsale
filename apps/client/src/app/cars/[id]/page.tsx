import { ArrowLeft, CalendarDays, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { CarImageGallery } from '@/components/car-image-gallery';
import { InquiryForm } from '@/components/inquiry-form';
import { Nav } from '@/components/nav';
import { getCar, getExchangeRate } from '@/lib/api';
import { lkr } from '@/lib/format';

export default async function CarDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [car, liveExchangeRate] = await Promise.all([getCar(id), getExchangeRate()]);

  if (!car) {
    return (
      <main>
        <Nav />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-3xl font-black text-foreground">Car not found</h1>
          <Link className="bg-brand-gradient mt-6 inline-flex rounded-panel px-4 py-3 text-sm font-black text-white" href="/dashboard">
            Back to cars
          </Link>
        </div>
      </main>
    );
  }

  const invoiceCifLkr = car.cost.invoiceCifLkr ?? car.cost.auctionPriceLkr + car.cost.shippingLkr + car.cost.insuranceLkr;
  const taxableCifLkr = car.cost.taxableCifLkr ?? invoiceCifLkr;
  const taxableCifLabel =
    car.cost.taxableCifSource === 'workbook-reference'
      ? 'Workbook reference CIF'
      : car.cost.taxableCifSource === 'yellow-book'
        ? 'Yellow Book CIF'
        : 'Invoice CIF';
  const vatFormula = `(${lkr(taxableCifLkr)} x 110% + CID + surcharge + XID) x ${percent(car.cost.vatRate ?? 0)}`;
  const exciseUnit = car.cost.exciseUnit ?? 'cc';
  const exciseQuantity = exciseUnit === 'kW' ? (car.cost.motorPowerKw ?? 0) : (car.cost.engineCapacity ?? 0);
  const exciseRate = car.cost.exciseRatePerUnitLkr ?? 0;
  const exciseDuty = car.cost.exciseDutyLkr ?? 0;
  const exciseFormula =
    exciseRate && Math.round(exciseQuantity * exciseRate) === exciseDuty
      ? `${exciseQuantity}${exciseUnit} x ${lkr(exciseRate)}`
      : `Fixed minimum duty for ${exciseQuantity}${exciseUnit}`;
  const rows = [
    ...(car.cost.referenceCifJpy
      ? [
          [
            'Workbook reference CIF',
            `${car.cost.referenceModel ?? 'Engine-band CIF reference'}: ${jpy(car.cost.referenceCifJpy)} x ${rate(car.cost.exchangeRateLkr)}`,
            lkr(car.cost.referenceCifLkr ?? car.cost.referenceCifJpy * car.cost.exchangeRateLkr),
          ],
          [
            'Workbook total',
            car.cost.referenceExchangeRateLkr ? `Shown in sheet at ${rate(car.cost.referenceExchangeRateLkr)}` : 'Shown in sheet',
            car.cost.referenceTotalLkr ? lkr(car.cost.referenceTotalLkr) : 'Not listed',
          ],
          ['Calculation basis', car.cost.referenceSource ?? 'Workbook reference', car.cost.calculationBasis ?? 'Auction price'],
        ]
      : []),
    ['Auction price', `${jpy(car.cost.auctionPriceJpy)} x ${rate(car.cost.exchangeRateLkr)}`, lkr(car.cost.auctionPriceLkr)],
    ['Freight', `${jpy(car.cost.freightJpy ?? 0)} x ${rate(car.cost.exchangeRateLkr)}`, lkr(car.cost.shippingLkr)],
    ['Insurance', `${jpy(car.cost.insuranceJpy ?? 0)} x ${rate(car.cost.exchangeRateLkr)}`, lkr(car.cost.insuranceLkr)],
    [
      'Invoice CIF',
      `${jpy(car.cost.invoiceCifJpy ?? car.cost.auctionPriceJpy + (car.cost.freightJpy ?? 0) + (car.cost.insuranceJpy ?? 0))} x ${rate(
        car.cost.exchangeRateLkr,
      )}`,
      lkr(invoiceCifLkr),
    ],
    [
      'Yellow Book CIF',
      car.cost.yellowBookValueJpy
        ? `((YB ${jpy(car.cost.yellowBookValueJpy)} x 100 / 110) x ${(car.cost.depreciationRate ?? 0.85).toFixed(2)} + freight ${jpy(
            car.cost.yellowBookFreightJpy ?? car.cost.freightJpy ?? 0,
          )} + insurance ${jpy(car.cost.insuranceJpy ?? 0)}) x ${rate(car.cost.exchangeRateLkr)}`
        : 'Not available for this model',
      lkr(car.cost.yellowBookCifLkr ?? 0),
    ],
    [
      'Taxable CIF',
      `Higher of Invoice CIF and Yellow Book CIF: ${taxableCifLabel}`,
      lkr(car.cost.taxableCifLkr ?? 0),
    ],
    ['CID', `${lkr(taxableCifLkr)} x ${percent(car.cost.cidRate ?? 0)}`, lkr(car.cost.cidBaseLkr ?? 0)],
    ['CID surcharge', `${lkr(car.cost.cidBaseLkr ?? 0)} x ${percent(car.cost.cidSurchargeRate ?? 0)}`, lkr(car.cost.cidSurchargeLkr ?? 0)],
    ['Excise duty (XID)', exciseFormula, lkr(exciseDuty)],
    ['Luxury tax (LXT)', `Max(0, taxable CIF - ${lkr(car.cost.luxuryThresholdLkr ?? 0)}) x ${percent(car.cost.luxuryRate ?? 0)}`, lkr(car.cost.luxuryTaxLkr ?? 0)],
    ['Vehicle entitlement levy', 'Fixed levy', lkr(car.cost.vehicleEntitlementLevyLkr ?? 0)],
    ['COM / Exm / Seal', 'Fixed charge', lkr(car.cost.comExmSealLkr ?? 0)],
    ['VAT', vatFormula, lkr(car.cost.vatLkr)],
    ['SSCL', `Tax base x ${percent(car.cost.ssclRate ?? 0)}`, lkr(car.cost.ssclLkr ?? 0)],
    ['Total taxes and levies', 'CID + surcharge + XID + luxury + VAT + SSCL + levies', lkr(car.cost.importDutyLkr)],
    ['Bank charges', 'Local cost', lkr(car.cost.bankChargesLkr ?? 0)],
    ['Clearing charges', 'Local cost', lkr(car.cost.clearingChargesLkr ?? car.cost.portHandlingLkr)],
    ['Supplier commission', 'Local cost', lkr(car.cost.supplierCommissionLkr ?? 0)],
    ['Importer commission', 'Local cost', lkr(car.cost.importerCommissionLkr ?? car.cost.serviceFeeLkr)],
    ['Deposit / reservation', 'Local cost', lkr(car.cost.depositLkr ?? 0)],
    ['Local transport', 'Local cost', lkr(car.cost.localTransportLkr)],
    ['Total other costs', 'Bank + clearing + commissions + deposit + transport', lkr(car.cost.totalOtherCostsLkr ?? 0)],
  ];

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link className="mb-5 inline-flex items-center gap-2 text-sm font-black text-muted hover:text-foreground" href="/dashboard">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <CarImageGallery car={car} />
          <div className="space-y-5">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-signal">{car.location}</p>
              <h1 className="mt-2 text-4xl font-black leading-tight text-foreground">{car.title}</h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                {car.year} {car.maker} {car.model}, {car.mileageKm.toLocaleString()} km, {car.fuelType}, {car.transmission},
                auction grade {car.auctionGrade}.
              </p>
              <div className="mt-5 grid gap-3 border-y border-line py-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 shrink-0 text-signal" size={18} />
                  <div>
                    <p className="text-xs font-black uppercase text-muted">Auction date</p>
                    <p className="mt-1 text-sm font-black text-foreground">
                      {formatDate(car.auctionDate, 'Not provided')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 shrink-0 text-signal" size={18} />
                  <div>
                    <p className="text-xs font-black uppercase text-muted">Advertisement created</p>
                    <p className="mt-1 text-sm font-black text-foreground">
                      {formatDate(car.createdAt, 'Not available')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-panel border-l-4 border-brass bg-jdm-panel p-5 text-white">
              <p className="text-xs font-black uppercase tracking-wide text-white/70">Estimated delivered cost to Sri Lanka</p>
              <p className="mt-2 text-4xl font-black">{lkr(car.cost.totalLkr)}</p>
              <p className="mt-2 text-xs text-white/65">
                Exchange rate used: 1 JPY = LKR {car.cost.exchangeRateLkr}
                {car.cost.exchangeRateDate ? ` (${car.cost.exchangeRateDate})` : ''}
              </p>
              <p className="mt-1 text-xs text-white/65">
                Tax base follows the higher of invoiced CIF and grade/variant Yellow Book CIF.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {car.features.map((feature) => (
                <span className="inline-flex items-center gap-2 rounded-panel border border-line bg-surface px-3 py-2 text-sm font-bold text-sub" key={feature}>
                  <Check size={15} className="text-signal" /> {feature}
                </span>
              ))}
            </div>
            {car.sourceUrl ? (
              <a className="inline-flex items-center gap-2 text-sm font-black text-signal" href={car.sourceUrl} rel="noreferrer" target="_blank">
                View source reference <ExternalLink size={15} />
              </a>
            ) : null}
          </div>
        </div>
      </section>
      <section
        className="mx-auto grid max-w-7xl scroll-mt-24 gap-8 px-4 pb-14 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8"
        id="landed-cost"
      >
        <div className="rounded-panel border border-line bg-surface p-5 shadow-soft">
          <h2 className="text-2xl font-black text-foreground">Transparent landed cost</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Estimate model follows the PiXAMP-style tax structure and the Excel rule where the higher of invoiced CIF
            and Yellow Book CIF becomes the taxable base.
          </p>
          {liveExchangeRate ? (
            <div className="mt-4 border border-line bg-field p-3 text-xs font-bold text-sub">
              <p>
                Daily converter: 1 JPY = LKR {liveExchangeRate.rate.toFixed(4)} on {liveExchangeRate.date}.
              </p>
              <p className="mt-1 text-muted">
                This listing used {rate(car.cost.exchangeRateLkr)}
                {car.cost.exchangeRateProvider ? ` from ${car.cost.exchangeRateProvider}` : ''}.
              </p>
            </div>
          ) : null}
          <div className="mt-5 divide-y divide-line">
            {rows.map(([label, formula, value]) => (
              <div className="grid gap-2 py-3 text-sm sm:grid-cols-[170px_1fr_140px] sm:items-center" key={label}>
                <span className="font-bold text-muted">{label}</span>
                <span className="text-xs font-semibold leading-5 text-sub">{formula}</span>
                <span className="text-right font-black text-foreground">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 py-4 text-lg">
              <span className="font-black text-foreground">Total handover estimate</span>
              <span className="text-right font-black text-signal">{lkr(car.cost.totalLkr)}</span>
            </div>
          </div>
          {car.cost.taxPolicyEffectiveFrom ? (
            <p className="mt-4 text-xs font-bold text-muted">
              Tax policy: {car.cost.taxPolicyName ?? 'Active tax policy'} effective {car.cost.taxPolicyEffectiveFrom}
            </p>
          ) : null}
        </div>
        <InquiryForm carId={car._id} carTitle={car.title} />
      </section>
    </main>
  );
}

function jpy(value: number) {
  return `${Math.round(value).toLocaleString()} JPY`;
}

function rate(value: number) {
  return `LKR ${value.toFixed(4)}`;
}

function percent(value: number) {
  return `${(value * 100).toFixed(value * 100 % 1 === 0 ? 0 : 2)}%`;
}

function formatDate(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}
