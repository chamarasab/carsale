import { ArrowRight, CalendarDays, Gauge, JapaneseYen, MapPin, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { CarPhoto, firstVehiclePhoto } from '@/components/car-photo';
import { auctionGradeDescription } from '@/lib/auction-grades';
import { compactNumber, formatAuctionDate, jpy } from '@/lib/format';
import { Car } from '@/lib/types';

export function CarListItem({ car }: { car: Car }) {
  const thumbnail = firstVehiclePhoto(car.images);
  const showAuctionDate = car.status === 'available';
  const cardBadge = showAuctionDate ? formatAuctionDate(car.auctionDate) : car.status;

  return (
    <Link
      className="car-card group grid min-h-[124px] grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-panel border border-line bg-surface shadow-soft transition duration-300 hover:border-signal/40 hover:shadow-theme md:grid-cols-[230px_1fr_auto]"
      href={`/cars/${car._id}`}
    >
      <div className="relative min-h-[124px] bg-field md:min-h-44">
        <CarPhoto
          car={car}
          className="transition duration-500 group-hover:scale-105"
          image={thumbnail}
          sizes="(min-width: 768px) 230px, 112px"
        />
        <div
          className="bg-brand-gradient-inverse absolute left-2 top-2 rounded-panel px-2 py-1 text-[10px] font-black uppercase text-white shadow md:left-3 md:top-3 md:px-3 md:text-xs"
          title={auctionGradeDescription(car.auctionGrade)}
        >
          Grade {car.auctionGrade}
        </div>
        <div
          className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-panel bg-black/65 px-2 py-1 text-[9px] font-black uppercase text-white md:hidden"
          title={showAuctionDate ? `Auction date: ${cardBadge}` : cardBadge}
        >
          {showAuctionDate ? <CalendarDays aria-hidden size={11} /> : null}
          {cardBadge}
        </div>
      </div>
      <div className="min-w-0 p-3 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[10px] font-bold uppercase text-signal md:text-xs md:tracking-wide">
            {car.source}
          </span>
          <span
            className="hidden items-center gap-1.5 rounded-panel border border-line bg-field px-2 py-1 text-[11px] font-black uppercase text-sub md:inline-flex"
            title={showAuctionDate ? `Auction date: ${cardBadge}` : cardBadge}
          >
            {showAuctionDate ? <CalendarDays aria-hidden size={13} /> : null}
            {cardBadge}
          </span>
        </div>
        <h2 className="mt-1 text-base font-black leading-tight text-foreground line-clamp-2 md:mt-2 md:text-2xl">
          {car.title}
        </h2>
        <p className="mt-2 hidden text-sm leading-6 text-muted md:block">
          {car.year} {car.maker} {car.model}, {car.fuelType}, {car.transmission}
        </p>
        <div className="mt-2 flex gap-3 text-[11px] font-bold text-muted md:hidden">
          <span>{car.year}</span>
          <span>{compactNumber(car.mileageKm)} km</span>
        </div>
        <div className="mt-4 hidden gap-2 text-xs font-bold text-muted md:grid md:grid-cols-3">
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
        <div className="mt-2 border-t border-line pt-2 md:hidden">
          <p className="text-[9px] font-black uppercase text-muted">Japan auction price</p>
          <p className="truncate text-base font-black text-signal">{jpy(car.cost.auctionPriceJpy)}</p>
        </div>
      </div>
      <div className="hidden items-center justify-between gap-4 border-t border-line p-5 md:flex md:min-w-64 md:flex-col md:items-start md:justify-center md:border-l md:border-t-0">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted">
            <JapaneseYen size={14} /> Japan auction price
          </p>
          <p className="mt-1 text-2xl font-black text-foreground">{jpy(car.cost.auctionPriceJpy)}</p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm font-black text-signal">
          View <ArrowRight size={16} />
        </span>
      </div>
    </Link>
  );
}
