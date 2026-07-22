import { CalendarDays, Gauge, JapaneseYen, MapPin, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { CarPhoto, firstVehiclePhoto } from '@/components/car-photo';
import { auctionGradeDescription } from '@/lib/auction-grades';
import { compactNumber, formatAuctionDate, jpy } from '@/lib/format';
import { Car } from '@/lib/types';

export function CarCard({ car }: { car: Car }) {
  const thumbnail = firstVehiclePhoto(car.images);
  const showAuctionDate = car.status === 'available';
  const cardBadge = showAuctionDate ? formatAuctionDate(car.auctionDate) : car.status;

  return (
    <Link
      className="car-card group grid min-h-[132px] grid-cols-[128px_minmax(0,1fr)] overflow-hidden rounded-panel border border-line bg-surface shadow-soft transition duration-300 hover:border-signal/40 hover:shadow-theme sm:block sm:min-h-0 sm:hover:-translate-y-1"
      href={`/cars/${car._id}`}
    >
      <div className="relative min-h-[132px] overflow-hidden bg-field sm:aspect-[16/10] sm:min-h-0">
        <CarPhoto
          car={car}
          className="transition duration-500 group-hover:scale-105"
          image={thumbnail}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 128px"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/72 to-transparent sm:h-24" />
        <div
          className="bg-brand-gradient-inverse absolute left-2 top-2 rounded-panel px-2 py-1 text-[10px] font-black uppercase text-white shadow sm:left-3 sm:top-3 sm:px-3 sm:text-xs"
          title={auctionGradeDescription(car.auctionGrade)}
        >
          Grade {car.auctionGrade}
        </div>
        <div
          className="bg-brand-gradient absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-panel px-2 py-1 text-[9px] font-black uppercase text-white shadow sm:bottom-3 sm:right-3 sm:px-3 sm:text-xs"
          title={showAuctionDate ? `Auction date: ${cardBadge}` : cardBadge}
        >
          {showAuctionDate ? <CalendarDays aria-hidden size={12} /> : null}
          {cardBadge}
        </div>
      </div>
      <div className="min-w-0 p-3 sm:space-y-4 sm:p-5">
        <div>
          <p className="truncate text-[10px] font-bold uppercase text-signal sm:text-xs sm:tracking-wide">
            {car.source}
          </p>
          <h2 className="mt-1 text-base font-black leading-tight text-foreground line-clamp-2 sm:min-h-14 sm:text-xl">
            {car.title}
          </h2>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-muted sm:hidden">
          <span>{car.year}</span>
          <span>{compactNumber(car.mileageKm)} km</span>
        </div>
        <div className="hidden grid-cols-3 gap-2 border-y border-line py-3 text-xs font-bold text-muted sm:grid">
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
        <div className="mt-2 border-t border-line pt-2 sm:mt-0 sm:rounded-panel sm:border-l-4 sm:border-t-0 sm:border-brass sm:bg-jdm-panel sm:p-4 sm:text-white">
          <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-muted sm:gap-2 sm:text-xs sm:tracking-wide sm:text-white/65">
            <JapaneseYen size={14} /> Japan auction price
          </p>
          <p className="mt-0.5 truncate text-lg font-black text-signal sm:mt-1 sm:text-2xl sm:text-white">
            {jpy(car.cost.auctionPriceJpy)}
          </p>
        </div>
      </div>
    </Link>
  );
}
