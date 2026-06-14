import Image from 'next/image';

const models = ['Supra A80', 'Skyline GT-R', 'RX-7 FD', 'NSX NA1', 'Evo VI'];

export function HeroSlider() {
  return (
    <div className="hero-media absolute inset-0">
      <Image
        alt="Japanese JDM sports cars at a Tokyo auction yard"
        className="object-cover"
        fill
        priority
        sizes="100vw"
        src="/jdm-hero.png"
      />
      <div className="absolute bottom-5 left-4 right-4 z-10 mx-auto hidden max-w-7xl justify-end md:flex">
        <div className="flex flex-wrap justify-end gap-2">
          {models.map((model) => (
            <span
              className="border border-white/20 bg-white/12 px-3 py-2 text-xs font-black uppercase text-white shadow-soft backdrop-blur"
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
