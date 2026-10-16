import Image from "next/image";

function HeroPhone() {
  return (
    <div className="relative mx-auto hidden min-h-[34rem] w-full max-w-md justify-center lg:flex">
      <aside
        aria-hidden
        className="absolute top-20 left-0 z-20 w-40 -rotate-8 rounded-cards bg-pitch-black px-ds-16 py-ds-16 text-paper-white shadow-card"
      >
        <p className="font-foggy text-[1.65rem] leading-[0.9] uppercase">
          Nos vemos en el parche
        </p>
      </aside>

      <div className="device-frame relative z-10 ml-16 aspect-[9/19.5] w-[270px] rounded-[2.4rem] p-[11px]">
        <div
          aria-hidden
          className="absolute top-[18px] left-1/2 z-30 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-pitch-black"
        />
        <div className="relative h-full overflow-hidden rounded-[1.85rem] bg-pitch-black">
          <Image
            src="/landing/hero-crowd.jpg"
            alt=""
            fill
            sizes="270px"
            className="object-cover object-center opacity-55"
          />
          <div className="absolute inset-0 bg-linear-to-b from-pitch-black/30 via-pitch-black/55 to-pitch-black" />
          <div className="relative flex h-full flex-col px-ds-12 pt-10 pb-ds-16 text-paper-white">
            <div className="flex items-center justify-between text-[10px] font-bold tracking-favorit uppercase opacity-70">
              <span>Parche</span>
              <span>9:41</span>
            </div>
            <p className="mt-ds-16 font-favorit text-[1.35rem] font-bold leading-[1.05] tracking-tight">
              Qué hay <span className="text-aurora">hoy</span>?
            </p>
            <div className="mt-ds-12 rounded-full bg-paper-white px-ds-12 py-ds-8 text-[11px] text-pitch-black/45">
              Buscar eventos, artistas...
            </div>
            <ul className="mt-ds-16 flex flex-col gap-ds-8">
              {[
                { title: "Festival Nocturno", meta: "Club Central · Bogotá" },
                { title: "Latido en Vivo", meta: "Teatro Libre · Bogotá" },
              ].map((item) => (
                <li
                  key={item.title}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-pitch-black/55 p-ds-12 backdrop-blur-md"
                >
                  <p className="text-[10px] font-bold tracking-favorit uppercase text-aurora">
                    Esta semana
                  </p>
                  <p className="mt-ds-4 text-[13px] font-bold leading-tight">
                    {item.title}
                  </p>
                  <p className="mt-ds-4 text-[10px] text-paper-white/70">
                    {item.meta}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export { HeroPhone };
