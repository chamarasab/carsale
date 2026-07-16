import { ArrowRight, Gauge, MapPin, ShieldCheck, Ship } from 'lucide-react';
import Link from 'next/link';
import { CarPhoto, firstVehiclePhoto } from '@/components/car-photo';
import { auctionGradeDescription } from '@/lib/auction-grades';
import { compactNumber, lkr } from '@/lib/format';
import { Car } from '@/lib/types';

export function CarListItem({ car }: { car: Car }) {
  const thumbnail = firstVehiclePhoto(car.images);

  return (
    <Link
      className="car-card group grid overflow-hidden rounded-panel border border-line bg-surface shadow-soft transition duration-300 hover:border-signal/40 hover:shadow-theme md:grid-cols-[230px_1fr_auto]"
      href={`/cars/${car._id}`}
    >
      <div className="relative aspect-[16/10] bg-field md:aspect-auto md:min-h-44">
        <CarPhoto
          car={car}
          className="transition duration-500 group-hover:scale-105"
          image={thumbnail}
          sizes="(min-width: 768px) 230px, 100vw"
        />
        <div
          className="bg-brand-gradient-inverse absolute left-3 top-3 rounded-panel px-3 py-1 text-xs font-black uppercase text-white shadow"
          title={auctionGradeDescription(car.auctionGrade)}
        >
          Auction {car.auctionGrade}
        </div>
      </div>
      <div className="min-w-0 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-signal">{car.source}</span>
          <span className="rounded-panel border border-line bg-field px-2 py-1 text-[11px] font-black uppercase text-sub">
            {car.status}
          </span>
        </div>
        <h2 className="mt-2 text-2xl font-black leading-tight text-foreground line-clamp-2">{car.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {car.year} {car.maker} {car.model}, {car.fuelType}, {car.transmission}
        </p>
        <div className="mt-4 grid gap-2 text-xs font-bold text-muted sm:grid-cols-3">
          <span className="inline-flex min-w-0 items-center gap-1">
            <Gauge size={14} /> {compactNumber(car.mileageKm)} km
          </span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <ShieldCheck size={14} /> {car.year}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1 truncate">
            <MapPin size={14} /> <span className="truncate">{car.location}</span>
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-line p-5 md:min-w-64 md:flex-col md:items-start md:justify-center md:border-l md:border-t-0">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
            <Ship size={14} /> Estimated delivered cost
          </p>
          <p className="mt-1 text-2xl font-black text-foreground">{lkr(car.cost.totalLkr)}</p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-black text-signal">
          View <ArrowRight size={16} />
        </span>
      </div>
    </Link>
  );
}
