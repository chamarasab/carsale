import { Gauge, MapPin, ShieldCheck, Ship } from 'lucide-react';
import Link from 'next/link';
import { CarPhoto, firstVehiclePhoto } from '@/components/car-photo';
import { compactNumber, lkr } from '@/lib/format';
import { Car } from '@/lib/types';

export function CarCard({ car }: { car: Car }) {
  const thumbnail = firstVehiclePhoto(car.images);

  return (
    <Link
      className="car-card group block overflow-hidden rounded-panel border border-line bg-surface shadow-soft transition duration-300 hover:-translate-y-1 hover:border-signal/40 hover:shadow-theme"
      href={`/cars/${car._id}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-field">
        <CarPhoto
          car={car}
          className="transition duration-500 group-hover:scale-105"
          image={thumbnail}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/72 to-transparent" />
        <div className="bg-brand-gradient-inverse absolute left-3 top-3 rounded-panel px-3 py-1 text-xs font-black uppercase text-white shadow">
          Grade {car.auctionGrade}
        </div>
        <div className="bg-brand-gradient absolute bottom-3 right-3 rounded-panel px-3 py-1 text-xs font-black uppercase text-white shadow">
          {car.status}
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-signal">{car.source}</p>
          <h2 className="mt-1 min-h-14 text-xl font-black leading-tight text-foreground line-clamp-2">{car.title}</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 border-y border-line py-3 text-xs font-bold text-muted">
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
        <div className="rounded-panel border-l-4 border-brass bg-jdm-panel p-4 text-white">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/65">
            <Ship size={14} /> Estimated delivered cost
          </p>
          <p className="mt-1 text-2xl font-black text-white">{lkr(car.cost.totalLkr)}</p>
        </div>
      </div>
    </Link>
  );
}
