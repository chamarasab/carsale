'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Car } from '@/lib/types';
import { CarPhoto, hasAuctionPhoto, isLikelyAuctionSheet } from './car-photo';

export function CarImageGallery({ car }: { car: Car }) {
  const images = car.images
    .filter(hasAuctionPhoto)
    .sort((left, right) => Number(isLikelyAuctionSheet(left)) - Number(isLikelyAuctionSheet(right)));
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isOpen = activeIndex !== null;

  const close = () => setActiveIndex(null);
  const previous = () =>
    setActiveIndex((current) => (current === null ? null : (current - 1 + images.length) % images.length));
  const next = () =>
    setActiveIndex((current) => (current === null ? null : (current + 1) % images.length));

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft' && images.length > 1) previous();
      if (event.key === 'ArrowRight' && images.length > 1) next();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, images.length]);

  const previewImages = images.slice(0, 3);

  return (
    <>
      <div>
        <button
          aria-label={`Preview ${car.title} image 1`}
          className="relative block aspect-[16/10] w-full cursor-zoom-in overflow-hidden rounded-panel bg-field"
          onClick={() => images.length && setActiveIndex(0)}
          type="button"
        >
          <CarPhoto car={car} priority sizes="(min-width: 1024px) 58vw, 100vw" />
        </button>
        {previewImages.length > 1 ? (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {previewImages.slice(1).map((image, index) => (
              <button
                aria-label={`Preview ${car.title} image ${index + 2}`}
                className="relative block aspect-[16/10] w-full cursor-zoom-in overflow-hidden rounded-panel bg-field"
                key={image}
                onClick={() => setActiveIndex(index + 1)}
                type="button"
              >
                <CarPhoto car={car} image={image} sizes="(min-width: 1024px) 29vw, 50vw" />
                {index === 1 && images.length > 3 ? (
                  <span className="absolute inset-0 grid place-items-center bg-black/55 text-lg font-black text-white">
                    +{images.length - 3} images
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {activeIndex !== null ? (
        <div
          aria-label={`${car.title} image preview`}
          aria-modal="true"
          className="fixed inset-0 z-[100] flex flex-col bg-black/95"
          onClick={close}
          role="dialog"
        >
          <div className="flex h-16 shrink-0 items-center justify-between gap-4 px-4 text-white sm:px-6">
            <p className="min-w-0 truncate text-sm font-bold">{car.title}</p>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm font-bold text-white/70">
                {activeIndex + 1} / {images.length}
              </span>
              <button
                aria-label="Close image preview"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={close}
                type="button"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          <div className="relative min-h-0 flex-1" onClick={(event) => event.stopPropagation()}>
            <img
              alt={`${car.title} image ${activeIndex + 1}`}
              className="h-full w-full object-contain px-4 pb-4 sm:px-16"
              src={images[activeIndex]}
            />
            {images.length > 1 ? (
              <>
                <button
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white hover:bg-black/80 sm:left-5"
                  onClick={previous}
                  type="button"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white hover:bg-black/80 sm:right-5"
                  onClick={next}
                  type="button"
                >
                  <ChevronRight size={28} />
                </button>
              </>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div
              className="flex h-24 shrink-0 gap-2 overflow-x-auto px-4 py-3 sm:justify-center sm:px-6"
              onClick={(event) => event.stopPropagation()}
            >
              {images.map((image, index) => (
                <button
                  aria-label={`View image ${index + 1}`}
                  aria-pressed={index === activeIndex}
                  className={`relative aspect-[16/10] h-full shrink-0 overflow-hidden border-2 ${
                    index === activeIndex ? 'border-white' : 'border-transparent opacity-55 hover:opacity-100'
                  }`}
                  key={image}
                  onClick={() => setActiveIndex(index)}
                  type="button"
                >
                  <img alt="" className="h-full w-full object-cover" src={image} />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
