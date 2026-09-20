import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { Icon } from "@/components/ui/icon";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import type { PublicEventCard } from "@/lib/events";
import { cityExploreItems } from "@/lib/landing";
import { cn } from "@/lib/utils";

function CityExplore({ events }: { events: readonly PublicEventCard[] }) {
  const cities = cityExploreItems(events);

  return (
    <Section id="ciudades" aria-labelledby="ciudades-heading">
      <Container>
        <SectionHeading
          id="ciudades-heading"
          title="Explora por ciudad"
          description="La música también se vive cerca."
          action={
            <a
              href="/explorar?v=map"
              className="font-favorit text-body-sm text-muted-foreground outline-none hover:text-aurora focus-visible:ring-2 focus-visible:ring-aurora"
            >
              Ver mapa
            </a>
          }
        />
        <ul className="grid gap-ds-16 sm:grid-cols-2 lg:grid-cols-5">
          {cities.map((city, index) => {
            const empty = city.count === 0;
            return (
              <Reveal as="li" key={city.slug} delayMs={index * 70}>
                <Link
                  href={empty ? "/#descarga" : "/explorar"}
                  className="group relative flex aspect-4/5 overflow-hidden rounded-cards bg-muted shadow-card outline-none focus-visible:ring-2 focus-visible:ring-aurora"
                >
                  <Image
                    src={city.image}
                    alt={`Vista de ${city.name}`}
                    fill
                    sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"
                    className={cn(
                      "object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.05]",
                      empty && "opacity-70",
                    )}
                  />
                  <div className="card-photo-scrim absolute inset-0" />
                  <div className="relative z-10 mt-auto flex w-full items-end justify-between p-ds-16 text-paper-white">
                    <div>
                      <p className="font-favorit text-subheading font-bold tracking-tight">
                        {city.name}
                      </p>
                      <p className="text-caption font-normal tracking-normal text-paper-white/75">
                        {empty
                          ? "Próximamente"
                          : city.count === 1
                            ? "1 evento"
                            : `${city.count} eventos`}
                      </p>
                    </div>
                    <span className="flex size-8 items-center justify-center rounded-full bg-paper-white/15">
                      <Icon as={ArrowUpRight} size={14} className="text-paper-white" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}

export { CityExplore };
