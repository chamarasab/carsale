'use client';

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

const handoverPhotos = Array.from(
  { length: 41 },
  (_, index) => `/customer-handovers/handover-${String(index + 1).padStart(2, '0')}.webp`,
);

const autoplayDelayMs = 4500;

export function CustomerHandoverCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);

  const goToPhoto = useCallback((requestedIndex: number, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const index = (requestedIndex + handoverPhotos.length) % handoverPhotos.length;
    const slide = scroller.querySelector<HTMLElement>(`[data-handover-index="${index}"]`);
    if (!slide) return;

    scroller.scrollTo({ left: slide.offsetLeft, behavior });
    setActiveIndex(index);
  }, []);

  const syncActivePhoto = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const slides = Array.from(scroller.querySelectorAll<HTMLElement>('[data-handover-index]'));
    const closest = slides.reduce((current, slide) =>
      Math.abs(slide.offsetLeft - scroller.scrollLeft) <
      Math.abs(current.offsetLeft - scroller.scrollLeft)
        ? slide
        : current,
    );

    setActiveIndex(Number(closest.dataset.handoverIndex));
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) setPaused(true);

    const pauseForReducedMotion = (event: MediaQueryListEvent) => {
      if (event.matches) setPaused(true);
    };

    reducedMotion.addEventListener('change', pauseForReducedMotion);
    return () => reducedMotion.removeEventListener('change', pauseForReducedMotion);
  }, []);

  useEffect(() => {
    if (paused || interacting) return;

    const timer = window.setTimeout(() => goToPhoto(activeIndex + 1), autoplayDelayMs);
    return () => window.clearTimeout(timer);
  }, [activeIndex, goToPhoto, interacting, paused]);

  return (
    <section
      aria-labelledby="customer-handovers-title"
      className="bg-jdm-panel border-y border-white/10 py-14 text-white"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteracting(false);
      }}
      onFocusCapture={() => setInteracting(true)}
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-wide text-brass">Customer handovers</p>
            <h2 className="mt-2 text-4xl font-black leading-tight text-white" id="customer-handovers-title">
              Real cars. Real handovers.
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/68 sm:text-base">
              A selection of vehicles proudly handed over to customers by Genuine Automobiles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="mr-2 min-w-16 text-sm font-black tabular-nums text-white/72" aria-label={`Photo ${activeIndex + 1} of ${handoverPhotos.length}`}>
              {String(activeIndex + 1).padStart(2, '0')} / {handoverPhotos.length}
            </div>
            <button
              aria-label="Previous handover photo"
              className="grid size-11 place-items-center rounded-panel border border-white/15 text-white transition hover:border-brass hover:text-brass"
              onClick={() => goToPhoto(activeIndex - 1)}
              title="Previous photo"
              type="button"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              aria-label={paused ? 'Play handover slideshow' : 'Pause handover slideshow'}
              className="grid size-11 place-items-center rounded-panel border border-white/15 text-white transition hover:border-brass hover:text-brass"
              onClick={() => setPaused((current) => !current)}
              title={paused ? 'Play slideshow' : 'Pause slideshow'}
              type="button"
            >
              {paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <button
              aria-label="Next handover photo"
              className="grid size-11 place-items-center rounded-panel border border-white/15 text-white transition hover:border-brass hover:text-brass"
              onClick={() => goToPhoto(activeIndex + 1)}
              title="Next photo"
              type="button"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div
          aria-label="Customer vehicle handover photos"
          className="customer-handover-scroller relative mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
          onScroll={syncActivePhoto}
          ref={scrollerRef}
          role="region"
        >
          {handoverPhotos.map((src, index) => (
            <article
              aria-label={`Customer handover photo ${index + 1}`}
              className="relative aspect-[4/3] flex-none basis-[88%] snap-start overflow-hidden rounded-panel border border-white/10 bg-[#11162d] sm:basis-[58%] lg:basis-[42%]"
              data-handover-index={index}
              key={src}
            >
              <Image
                alt={`Genuine Automobiles customer with a delivered vehicle, photo ${index + 1}`}
                className="object-contain"
                fill
                quality={70}
                sizes="(max-width: 639px) 88vw, (max-width: 1023px) 58vw, 42vw"
                src={src}
              />
            </article>
          ))}
        </div>

        <div className="mt-5 h-1 overflow-hidden bg-white/12" aria-hidden="true">
          <div
            className="bg-brand-gradient h-full transition-[width] duration-300"
            style={{ width: `${((activeIndex + 1) / handoverPhotos.length) * 100}%` }}
          />
        </div>
      </div>
    </section>
  );
}
