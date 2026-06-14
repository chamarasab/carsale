import { ArrowLeft, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { CarPhoto, hasAuctionPhoto } from '@/components/car-photo';
import { InquiryForm } from '@/components/inquiry-form';
import { Nav } from '@/components/nav';
import { getCar } from '@/lib/api';
import { lkr } from '@/lib/format';

export default async function CarDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const car = await getCar(id);

  if (!car) {
    return (
      <main>
        <Nav />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-3xl font-black text-ink">Car not found</h1>
          <Link className="mt-6 inline-flex bg-signal px-4 py-3 text-sm font-black text-white" href="/dashboard">
            Back to cars
          </Link>
        </div>
      </main>
    );
  }

  const rows = [
    ['Auction price', `${car.cost.auctionPriceJpy.toLocaleString()} JPY`],
    ['Converted auction price', lkr(car.cost.auctionPriceLkr)],
    ['Shipping', lkr(car.cost.shippingLkr)],
    ['Insurance', lkr(car.cost.insuranceLkr)],
    ['Invoice CIF', lkr(car.cost.invoiceCifLkr ?? car.cost.auctionPriceLkr + car.cost.shippingLkr + car.cost.insuranceLkr)],
    ['Yellow Book CIF', lkr(car.cost.yellowBookCifLkr ?? 0)],
    [
      `Taxable CIF (${car.cost.taxableCifSource === 'yellow-book' ? 'Yellow Book' : 'Invoice'})`,
      lkr(car.cost.taxableCifLkr ?? 0),
    ],
    ['CID', lkr(car.cost.cidBaseLkr ?? 0)],
    ['CID surcharge', lkr(car.cost.cidSurchargeLkr ?? 0)],
    ['Excise duty (XID)', lkr(car.cost.exciseDutyLkr ?? 0)],
    ['Luxury tax (LXT)', lkr(car.cost.luxuryTaxLkr ?? 0)],
    ['Vehicle entitlement levy', lkr(car.cost.vehicleEntitlementLevyLkr ?? 0)],
    ['COM / Exm / Seal', lkr(car.cost.comExmSealLkr ?? 0)],
    ['VAT', lkr(car.cost.vatLkr)],
    ['SSCL', lkr(car.cost.ssclLkr ?? 0)],
    ['Total taxes and levies', lkr(car.cost.importDutyLkr)],
    ['Bank charges', lkr(car.cost.bankChargesLkr ?? 0)],
    ['Clearing charges', lkr(car.cost.clearingChargesLkr ?? car.cost.portHandlingLkr)],
    ['Supplier commission', lkr(car.cost.supplierCommissionLkr ?? 0)],
    ['Importer commission', lkr(car.cost.importerCommissionLkr ?? car.cost.serviceFeeLkr)],
    ['Deposit / reservation', lkr(car.cost.depositLkr ?? 0)],
    ['Local transport', lkr(car.cost.localTransportLkr)],
    ['Total other costs', lkr(car.cost.totalOtherCostsLkr ?? 0)],
  ];

  return (
    <main>
      <Nav />
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link className="mb-5 inline-flex items-center gap-2 text-sm font-black text-graphite hover:text-ink" href="/dashboard">
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="relative aspect-[16/10] overflow-hidden bg-mist">
              <CarPhoto car={car} priority sizes="(min-width: 1024px) 58vw, 100vw" />
            </div>
            {car.images.slice(1, 3).some(hasAuctionPhoto) ? (
              <div className="mt-4 grid grid-cols-2 gap-4">
                {car.images.slice(1, 3).filter(hasAuctionPhoto).map((image) => (
                  <div className="relative aspect-[16/10] overflow-hidden bg-mist" key={image}>
                    <CarPhoto car={car} image={image} sizes="(min-width: 1024px) 29vw, 50vw" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-5">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-signal">{car.location}</p>
              <h1 className="mt-2 text-4xl font-black leading-tight text-ink">{car.title}</h1>
              <p className="mt-3 text-sm leading-6 text-graphite">
                {car.year} {car.maker} {car.model}, {car.mileageKm.toLocaleString()} km, {car.fuelType}, {car.transmission},
                auction grade {car.auctionGrade}.
              </p>
            </div>
            <div className="bg-ink p-5 text-white">
              <p className="text-xs font-black uppercase tracking-wide text-white/70">Estimated delivered cost to Sri Lanka</p>
              <p className="mt-2 text-4xl font-black">{lkr(car.cost.totalLkr)}</p>
              <p className="mt-2 text-xs text-white/65">Exchange rate used: 1 JPY = LKR {car.cost.exchangeRateLkr}</p>
              <p className="mt-1 text-xs text-white/65">
                Tax base follows the higher of invoiced CIF and grade/variant Yellow Book CIF.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {car.features.map((feature) => (
                <span className="inline-flex items-center gap-2 bg-white px-3 py-2 text-sm font-bold text-asphalt" key={feature}>
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
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-14 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <div className="bg-white p-5 shadow-soft">
          <h2 className="text-2xl font-black text-ink">Transparent landed cost</h2>
          <p className="mt-2 text-sm leading-6 text-graphite">
            Estimate model follows the PiXAMP-style tax structure and the Excel rule where the higher of invoiced CIF
            and Yellow Book CIF becomes the taxable base.
          </p>
          <div className="mt-5 divide-y divide-black/10">
            {rows.map(([label, value]) => (
              <div className="flex items-center justify-between gap-4 py-3 text-sm" key={label}>
                <span className="font-bold text-graphite">{label}</span>
                <span className="text-right font-black text-ink">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 py-4 text-lg">
              <span className="font-black text-ink">Total handover estimate</span>
              <span className="text-right font-black text-signal">{lkr(car.cost.totalLkr)}</span>
            </div>
          </div>
          {car.cost.taxPolicyEffectiveFrom ? (
            <p className="mt-4 text-xs font-bold text-graphite">
              Tax policy: {car.cost.taxPolicyName ?? 'Active tax policy'} effective {car.cost.taxPolicyEffectiveFrom}
            </p>
          ) : null}
        </div>
        <InquiryForm carId={car._id} />
      </section>
    </main>
  );
}
