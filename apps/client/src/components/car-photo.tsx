import { CameraOff } from 'lucide-react';
import Image from 'next/image';
import { Car } from '@/lib/types';

const defaultCarImage = '/blank-car-logo.svg';
const fallbackImages = new Set(['/jdm-hero.png', defaultCarImage]);

type CarPhotoProps = {
  car: Car;
  className?: string;
  image?: string;
  priority?: boolean;
  sizes?: string;
};

export function hasAuctionPhoto(image?: string) {
  return Boolean(image && !fallbackImages.has(image));
}

export function CarPhoto({ car, className = '', image = car.images[0], priority = false, sizes }: CarPhotoProps) {
  if (hasAuctionPhoto(image)) {
    return (
      <Image
        alt={car.title}
        className={`object-cover ${className}`}
        fill
        priority={priority}
        sizes={sizes}
        src={image}
      />
    );
  }

  return (
    <div className={`absolute inset-0 bg-mist ${className}`}>
      <img alt={`${car.title} default car image`} className="absolute inset-0 h-full w-full object-contain p-8" src={defaultCarImage} />
      <div className="absolute inset-4 flex flex-col justify-between border border-black/10 p-4 text-ink">
        <div className="flex items-center justify-between gap-3">
          <span className="grid h-10 w-10 place-items-center bg-white text-graphite shadow-sm">
            <CameraOff size={20} />
          </span>
          <span className="bg-white px-2 py-1 text-right text-xs font-black uppercase tracking-wide text-graphite shadow-sm">{car.source}</span>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-graphite">{car.maker}</p>
          <p className="mt-1 text-2xl font-black leading-tight text-ink">{car.model}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-graphite">Auction photo pending</p>
        </div>
      </div>
    </div>
  );
}
