'use client';

import { Gauge, MapPin, ShieldCheck, Ship } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CarPhoto } from '@/components/car-photo';
import { compactNumber, lkr } from '@/lib/format';
import { Car } from '@/lib/types';

export function CarCard({ car }: { car: Car }) {
  const images = useMemo(() => (car.images.length ? car.images : ['/blank-car-logo.svg']), [car.images]);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [car._id]);

  useEffect(() => {
    if (images.length < 2) return;

    const interval = window.setInterval(() => {
      setImageIndex((current) => (current + 1) % images.length);
    }, 3200);

    return () => window.clearInterval(interval);
  }, [images.length]);

  return (
    <Link
      className="group block overflow-hidden border border-black/10 bg-white shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
      href={`/cars/${car._id}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-mist">
        <CarPhoto
          car={car}
          className="transition duration-500 group-hover:scale-105"
          image={images[imageIndex]}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/72 to-transparent" />
        <div className="absolute left-3 top-3 bg-white px-3 py-1 text-xs font-black uppercase text-ink shadow">
          Grade {car.auctionGrade}
        </div>
        <div className="absolute bottom-3 right-3 bg-signal px-3 py-1 text-xs font-black uppercase text-white shadow">
          {car.status}
        </div>
        {images.length > 1 ? (
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {images.map((image, index) => (
              <span
                className={`h-1.5 w-6 transition ${index === imageIndex ? 'bg-white' : 'bg-white/42'}`}
                key={`${image}-${index}`}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-signal">{car.source}</p>
          <h2 className="mt-1 min-h-14 text-xl font-black leading-tight text-ink line-clamp-2">{car.title}</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 border-y border-black/10 py-3 text-xs font-bold text-graphite">
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
        <div className="bg-ink p-4 text-white">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/65">
            <Ship size={14} /> Estimated delivered cost
          </p>
          <p className="mt-1 text-2xl font-black text-white">{lkr(car.cost.totalLkr)}</p>
        </div>
      </div>
    </Link>
  );
}
