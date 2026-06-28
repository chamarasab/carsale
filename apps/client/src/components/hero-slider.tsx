import Image from 'next/image';

const models = ['Wagon R Custom Z', 'Daihatsu Thor', 'Daihatsu Rocky', 'Mira e:S'];

export function HeroSlider() {
  return (
    <div className="hero-media absolute inset-0">
      <Image
        alt="Newer Japanese compact cars ready for shipment to Sri Lanka"
        className="object-cover"
        fill
        priority
        quality={70}
        sizes="100vw"
        src="/jdm-family-hero.webp"
      />
      <div className="absolute bottom-5 left-4 right-4 z-10 mx-auto hidden max-w-7xl justify-end md:flex">
        <div className="flex flex-wrap justify-end gap-2">
          {models.map((model) => (
            <span
              className="rounded-panel border border-white/20 bg-white/12 px-3 py-2 text-xs font-black uppercase text-white shadow-soft"
              key={model}
            >
              {model}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
