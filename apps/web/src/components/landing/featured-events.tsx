import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Container, EmptyPanel, Section, SectionHeading } from "@/components/ui/layout";
import { Tag } from "@/components/ui/tag";
import { eventPath, type PublicEventCard } from "@/lib/events";
import { ageLabel, formatEventPosterBadge } from "@/lib/format";
import { firstGenre, flyerSrc, placeLine } from "@/lib/landing";
import { appWebHref } from "@/lib/site";
import { cn } from "@/lib/utils";

function DateBadge({ iso }: { iso: string }) {
  const badge = formatEventPosterBadge(iso);
  return (
    <span className="absolute top-ds-12 left-ds-12 z-10 rounded-xl bg-pitch-black/70 px-ds-8 py-ds-8 text-center font-favorit text-paper-white backdrop-blur-md">
      <span className="block text-[10px] font-bold tracking-favorit uppercase">
        {badge.weekday}
      </span>
      <span className="block text-caption font-bold tracking-tight">
        {badge.dayMonth}
      </span>
    </span>
  );
}

function EventCard({
  event,
  delayMs = 0,
}: {
  event: PublicEventCard;
  delayMs?: number;
}) {
  const flyer = flyerSrc(event);
  const place = placeLine(event);
  const genre = firstGenre(event);
  const age = ageLabel(event.agePolicy);

  return (
    <Reveal as="article" delayMs={delayMs} className="group h-full">
      <Link
        href={eventPath(event.id)}
        className={cn(
          "relative flex aspect-4/5 h-full flex-col overflow-hidden rounded-cards bg-surface shadow-card outline-none",
          "focus-visible:ring-2 focus-visible:ring-aurora",
        )}
      >
        <div className="absolute inset-0">
          {flyer ? (
            <Image
              src={flyer}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-parche motion-safe:group-hover:scale-[1.05]"
            />
          ) : (
            <div className="flex h-full items-end bg-muted p-ds-16">
              <span className="font-favorit text-heading font-bold tracking-tight">
                {event.title}
              </span>
            </div>
          )}
        </div>
        <div className="card-photo-scrim absolute inset-0" />
        <DateBadge iso={event.startsAt} />
        <span
          aria-hidden
          className="absolute top-ds-12 right-ds-12 z-10 flex size-9 items-center justify-center rounded-full bg-pitch-black/55 text-paper-white backdrop-blur-md"
        >
          <Heart size={14} />
        </span>
        <div className="relative z-10 mt-auto flex flex-col gap-ds-8 p-ds-16 text-paper-white">
          <h3 className="line-clamp-2 font-favorit text-subheading font-bold tracking-tight">
            {event.title}
          </h3>
          {place ? (
            <p className="line-clamp-1 text-caption font-normal tracking-normal text-paper-white/75">
              {place}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-ds-8">
            {genre ? <Tag tone="glass">{genre}</Tag> : null}
            {age ? <Tag tone="glass">{age}</Tag> : null}
          </div>
        </div>
      </Link>
    </Reveal>
  );
}

function FeaturedEvents({ events }: { events: readonly PublicEventCard[] }) {
  const featured = events.slice(0, 8);
  const allHref = appWebHref("/") ?? "#descarga";

  return (
    <Section id="eventos" aria-labelledby="eventos-heading">
      <Container>
        <SectionHeading
          id="eventos-heading"
          title="Eventos destacados"
          description="No te pierdas lo mejor que viene."
          action={
            events.length > 0 ? (
              <a
                href={allHref}
                className="font-favorit text-body-sm text-muted-foreground outline-none hover:text-aurora focus-visible:ring-2 focus-visible:ring-aurora"
              >
                Ver todos
              </a>
            ) : null
          }
        />
        {featured.length === 0 ? (
          <EmptyPanel
            title="Aún no hay fechas publicadas"
            body="Cuando salga el próximo cartel, aparece aquí. Entra a la app para armar el parche o crear una fecha."
            action={
              <Button href={allHref} size="sm">
                Entrar a la app
              </Button>
            }
          />
        ) : (
          <div className="grid gap-ds-16 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((event, index) => (
              <EventCard key={event.id} event={event} delayMs={index * 70} />
            ))}
          </div>
        )}
      </Container>
    </Section>
  );
}

export { EventCard, FeaturedEvents };
