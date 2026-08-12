'use client';

import { ChevronLeft, ChevronRight, Maximize2, Minus, Pause, Play, Plus, RotateCcw, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const portraitPhotoNumbers = new Set([
  6, 7, 8, 9, 10, 11, 12, 14, 15, 20, 21, 29, 30, 31, 32, 33, 35, 37, 38, 39, 40, 41,
]);
const handoverPhotos = Array.from(
  { length: 41 },
  (_, index) => ({
    portrait: portraitPhotoNumbers.has(index + 1),
    src: `/customer-handovers/handover-${String(index + 1).padStart(2, '0')}.webp`,
  }),
);

const autoplayDelayMs = 4500;
const minimumZoom = 1;
const maximumZoom = 3;
const zoomStep = 0.5;

type Point = { x: number; y: number };
type DragState = Point & { originX: number; originY: number; pointerId: number };

export function CustomerHandoverCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const closeViewerRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(minimumZoom);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

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

  const resetViewerPosition = useCallback(() => {
    setZoom(minimumZoom);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
    dragRef.current = null;
  }, []);

  const showViewerPhoto = useCallback((requestedIndex: number) => {
    const index = (requestedIndex + handoverPhotos.length) % handoverPhotos.length;
    setViewerIndex(index);
    resetViewerPosition();
    goToPhoto(index);
  }, [goToPhoto, resetViewerPosition]);

  const closeViewer = useCallback(() => {
    setViewerIndex(null);
    resetViewerPosition();
  }, [resetViewerPosition]);

  const changeZoom = useCallback((amount: number) => {
    setZoom((current) => Math.min(maximumZoom, Math.max(minimumZoom, current + amount)));
    setOffset({ x: 0, y: 0 });
    setDragging(false);
    dragRef.current = null;
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
    if (paused || interacting || viewerIndex !== null) return;

    const timer = window.setTimeout(() => goToPhoto(activeIndex + 1), autoplayDelayMs);
    return () => window.clearTimeout(timer);
  }, [activeIndex, goToPhoto, interacting, paused, viewerIndex]);

  useEffect(() => {
    if (viewerIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeViewer();
      if (event.key === 'ArrowLeft') showViewerPhoto(viewerIndex - 1);
      if (event.key === 'ArrowRight') showViewerPhoto(viewerIndex + 1);
      if (event.key === '+' || event.key === '=') changeZoom(zoomStep);
      if (event.key === '-') changeZoom(-zoomStep);
      if (event.key === '0') resetViewerPosition();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    closeViewerRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [changeZoom, closeViewer, resetViewerPosition, showViewerPhoto, viewerIndex]);

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= minimumZoom || (event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  };

  const dragImage = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const maxX = (event.currentTarget.clientWidth * (zoom - 1)) / 2;
    const maxY = (event.currentTarget.clientHeight * (zoom - 1)) / 2;
    setOffset({
      x: Math.min(maxX, Math.max(-maxX, drag.originX + event.clientX - drag.x)),
      y: Math.min(maxY, Math.max(-maxY, drag.originY + event.clientY - drag.y)),
    });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

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
          {handoverPhotos.map(({ portrait, src }, index) => (
            <article
              aria-label={`Customer handover photo ${index + 1}`}
              className="relative aspect-[4/3] flex-none basis-[88%] snap-start overflow-hidden rounded-panel border border-white/10 bg-[#11162d] sm:basis-[58%] lg:basis-[42%]"
              data-handover-index={index}
              key={src}
            >
              <button
                aria-label={`Open customer handover photo ${index + 1}`}
                className="group absolute inset-0 block size-full cursor-zoom-in overflow-hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brass"
                onClick={() => showViewerPhoto(index)}
                type="button"
              >
                <Image
                  alt={`Genuine Automobiles customer with a delivered vehicle, photo ${index + 1}`}
                  className={`${portrait ? 'object-cover' : 'object-contain'} object-center transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none`}
                  fill
                  priority={index === 0}
                  quality={70}
                  sizes="(max-width: 639px) 88vw, (max-width: 1023px) 58vw, 42vw"
                  src={src}
                />
                <span className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full border border-white/20 bg-black/55 text-white shadow-soft backdrop-blur-sm transition group-hover:bg-black/72">
                  <Maximize2 size={18} />
                </span>
              </button>
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

      {viewerIndex !== null
        ? createPortal(
            <div
              aria-label={`Customer handover photo ${viewerIndex + 1}`}
              aria-modal="true"
              className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white"
              role="dialog"
            >
              <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4 sm:px-6">
                <p className="text-sm font-black tabular-nums">
                  {String(viewerIndex + 1).padStart(2, '0')} / {handoverPhotos.length}
                </p>
                <button
                  aria-label="Close photo viewer"
                  className="grid size-11 place-items-center rounded-full border border-white/15 text-white transition hover:border-brass hover:text-brass"
                  onClick={closeViewer}
                  ref={closeViewerRef}
                  title="Close"
                  type="button"
                >
                  <X size={22} />
                </button>
              </header>

              <div
                className={`relative min-h-0 flex-1 touch-none overflow-hidden px-12 py-4 sm:px-20 ${zoom > minimumZoom ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
                onDoubleClick={() => changeZoom(zoom > minimumZoom ? minimumZoom - zoom : zoomStep * 2)}
                onPointerCancel={endDrag}
                onPointerDown={beginDrag}
                onPointerMove={dragImage}
                onPointerUp={endDrag}
              >
                <Image
                  alt={`Genuine Automobiles customer with a delivered vehicle, photo ${viewerIndex + 1}`}
                  className={`pointer-events-none select-none object-contain ${dragging ? 'transition-none' : 'transition-transform duration-200 motion-reduce:transition-none'}`}
                  fill
                  priority
                  quality={90}
                  sizes="100vw"
                  src={handoverPhotos[viewerIndex].src}
                  style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
                />

                <button
                  aria-label="Previous photo"
                  className="absolute left-1 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/55 text-white transition hover:border-brass hover:text-brass sm:left-4"
                  onClick={() => showViewerPhoto(viewerIndex - 1)}
                  title="Previous photo"
                  type="button"
                >
                  <ChevronLeft size={23} />
                </button>
                <button
                  aria-label="Next photo"
                  className="absolute right-1 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/55 text-white transition hover:border-brass hover:text-brass sm:right-4"
                  onClick={() => showViewerPhoto(viewerIndex + 1)}
                  title="Next photo"
                  type="button"
                >
                  <ChevronRight size={23} />
                </button>
              </div>

              <footer className="flex h-20 shrink-0 items-center justify-center gap-3 border-t border-white/10 px-4">
                <button
                  aria-label="Zoom out"
                  className="grid size-11 place-items-center rounded-full border border-white/15 transition hover:border-brass hover:text-brass disabled:cursor-not-allowed disabled:opacity-35"
                  disabled={zoom <= minimumZoom}
                  onClick={() => changeZoom(-zoomStep)}
                  title="Zoom out"
                  type="button"
                >
                  <Minus size={20} />
                </button>
                <span className="min-w-14 text-center text-sm font-black tabular-nums">{Math.round(zoom * 100)}%</span>
                <button
                  aria-label="Zoom in"
                  className="grid size-11 place-items-center rounded-full border border-white/15 transition hover:border-brass hover:text-brass disabled:cursor-not-allowed disabled:opacity-35"
                  disabled={zoom >= maximumZoom}
                  onClick={() => changeZoom(zoomStep)}
                  title="Zoom in"
                  type="button"
                >
                  <Plus size={20} />
                </button>
                <button
                  aria-label="Reset zoom and position"
                  className="grid size-11 place-items-center rounded-full border border-white/15 transition hover:border-brass hover:text-brass disabled:cursor-not-allowed disabled:opacity-35"
                  disabled={zoom === minimumZoom && offset.x === 0 && offset.y === 0}
                  onClick={resetViewerPosition}
                  title="Reset view"
                  type="button"
                >
                  <RotateCcw size={19} />
                </button>
              </footer>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
