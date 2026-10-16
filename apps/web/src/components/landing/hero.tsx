import Image from "next/image";
import {
  Disc3,
  Landmark,
  Martini,
  MoreHorizontal,
  Music2,
  Sparkles,
  Theater,
  type LucideIcon,
} from "lucide-react";

import { HeroPhone } from "@/components/landing/hero-phone";
import { HeroSearch } from "@/components/landing/hero-search";
import { Icon } from "@/components/ui/icon";
import { DEFAULT_CITY } from "@/constants/cities";
import { HERO_KICKERS, LANDING_CATEGORIES } from "@/constants/genres";
import type { PublicEventCard } from "@/lib/events";
import { socialAvatars } from "@/lib/landing";
import { appWebHref } from "@/lib/site";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  music: Music2,
  disc: Disc3,
  sparkles: Sparkles,
  masks: Theater,
  wine: Martini,
  landmark: Landmark,
  more: MoreHorizontal,
};

function Hero({ events }: { events: readonly PublicEventCard[] }) {
  const appHref = appWebHref("/");
  const avatars = socialAvatars(events);

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-hidden bg-background -mt-[4.75rem] pt-[6.5rem] sm:-mt-[5.25rem] sm:pt-[7.5rem]"
    >
      <div className="pointer-events-none absolute inset-0 page-glow" aria-hidden />
      <Image
        src="/landing/hero-crowd.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="pointer-events-none object-cover object-[center_30%] opacity-80 dark:opacity-90"
      />
      <div className="hero-photo-scrim pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 mx-auto grid max-w-page items-center gap-ds-32 px-ds-16 pb-ds-40 pt-ds-16 sm:px-ds-24 sm:pb-ds-48 sm:pt-ds-24 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:pb-ds-80 lg:pt-ds-32">
        <div className="flex w-full min-w-0 max-w-xl flex-col items-start">
          <p className="mb-ds-12 font-favorit text-[11px] font-bold tracking-favorit text-muted-foreground uppercase sm:mb-ds-16 sm:text-caption">
            {HERO_KICKERS.join(" · ")}
          </p>
          <h1
            id="hero-heading"
            className="max-w-[11ch] font-favorit text-[clamp(2.25rem,9vw,4.75rem)] font-bold tracking-tight text-foreground animate-parche-stamp sm:text-display"
          >
            Qué hay{" "}
            <span className="text-aurora">hoy</span> en tu ciudad?
          </h1>
          <p className="mt-ds-12 max-w-md text-body-sm text-muted-foreground animate-parche-rise sm:mt-ds-16 sm:text-body">
            Flyers, artistas y boletas en un solo parche. Escoge la noche y
            compra antes de que se agote.
          </p>
          <div className="mt-ds-20 w-full min-w-0 animate-parche-rise sm:mt-ds-24" style={{ animationDelay: "120ms" }}>
            <HeroSearch actionHref="/explorar" defaultCity={DEFAULT_CITY.slug} />
          </div>
          <ul className="-mx-ds-16 mt-ds-20 flex w-[calc(100%+2rem)] min-w-0 max-w-none gap-ds-12 overflow-x-auto px-ds-16 pb-ds-4 scrollbar-none sm:mx-0 sm:mt-ds-24 sm:w-full sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {LANDING_CATEGORIES.map((category) => {
              const icon = CATEGORY_ICONS[category.icon] ?? MoreHorizontal;
              const href =
                category.id === "mas"
                  ? "#eventos"
                  : `${appHref ?? "#eventos"}`;
              return (
                <li key={category.id} className="shrink-0">
                  <a
                    href={href}
                    className={cn(
                      "flex w-[4.5rem] flex-col items-center gap-ds-8 outline-none sm:w-16",
                      "focus-visible:ring-2 focus-visible:ring-aurora rounded-cards",
                    )}
                  >
                    <span className="flex size-14 items-center justify-center rounded-full border border-border bg-glass text-foreground backdrop-blur-xl sm:size-12">
                      <Icon as={icon} size={18} className="text-current" />
                    </span>
                    <span className="text-center font-favorit text-caption text-muted-foreground">
                      {category.label}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
          <div className="mt-ds-20 flex w-full min-w-0 items-start gap-ds-12 sm:mt-ds-24 sm:items-center">
            {avatars.length > 0 ? (
              <ul className="flex shrink-0 -space-x-2" aria-hidden>
                {avatars.map((src) => (
                  <li key={src} className="relative size-8 overflow-hidden rounded-full ring-2 ring-background">
                    <Image src={src} alt="" fill sizes="32px" className="object-cover" />
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="min-w-0 flex-1 text-body-sm leading-snug text-muted-foreground">
              {events.length === 1
                ? "1 evento a la venta. El parche ya está armado."
                : events.length > 1
                  ? `${events.length} eventos a la venta. El parche ya está armado.`
                  : "El parche se está armando en tu ciudad."}
            </p>
          </div>
        </div>

        <HeroPhone />
      </div>
    </section>
  );
}

export { Hero };
