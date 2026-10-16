import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Container, EmptyPanel, Section, SectionHeading } from "@/components/ui/layout";
import { Tag } from "@/components/ui/tag";
import {
  eventPath,
  listEventTicketTypes,
  lowestOnSale,
  type PublicEventCard,
  type PublicTicketType,
} from "@/lib/events";
import { ageLabel, formatEventLongDate, formatEventPosterBadge, formatEventTime, formatMoney } from "@/lib/format";
import { firstGenre, flyerSrc, lineupNames, placeLine } from "@/lib/landing";
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
        href={eventPath(event)}
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
            <Tag tone="glass">Comprar</Tag>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}

function SpotlightEvent({
  event,
  tickets,
}: {
  event: PublicEventCard;
  tickets: readonly PublicTicketType[];
}) {
  const flyer = flyerSrc(event);
  const place = placeLine(event);
  const genre = firstGenre(event);
  const lineup = lineupNames(event.lineup);
  const lowest = lowestOnSale(tickets);
  const detailHref = eventPath(event);
  const buyHref = appWebHref(`/event/${event.id}`) ?? detailHref;

  return (
    <article className="overflow-hidden rounded-cards border border-border bg-surface shadow-card md:grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <Link
        href={detailHref}
        className="relative block min-h-80 overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-aurora md:min-h-[28rem]"
      >
        {flyer ? (
          <Image
            src={flyer}
            alt={`Flyer de ${event.title}`}
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        ) : null}
        <div className="card-photo-scrim absolute inset-0 md:hidden" />
        <DateBadge iso={event.startsAt} />
      </Link>
      <div className="flex flex-col justify-center gap-ds-16 p-ds-24 sm:p-ds-32">
        <div className="flex flex-wrap gap-ds-8">
          {genre ? <Tag tone="aurora">{genre}</Tag> : null}
          <Tag tone="muted">Destacado</Tag>
        </div>
        <div className="flex flex-col gap-ds-8">
          <h3 className="font-favorit text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight text-foreground">
            <Link href={detailHref} className="outline-none hover:text-aurora focus-visible:ring-2 focus-visible:ring-aurora">
              {event.title}
            </Link>
          </h3>
          <p className="text-body text-muted-foreground">
            {formatEventLongDate(event.startsAt)} · {formatEventTime(event.startsAt)}
          </p>
          {place ? <p className="text-body-sm text-muted-foreground">{place}</p> : null}
          {lineup ? (
            <p className="line-clamp-2 text-body-sm text-muted-foreground">{lineup}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-ds-16">
          <div>
            <p className="font-favorit text-caption font-bold tracking-favorit text-muted-foreground uppercase">
              {lowest ? "Desde" : "Boleta"}
            </p>
            <p className="font-favorit text-heading-sm font-bold tracking-tight text-foreground">
              {lowest ? formatMoney(lowest.priceCents, lowest.currency) : "Ver ficha"}
            </p>
          </div>
          <div className="flex flex-wrap gap-ds-8">
            <Button href={detailHref} variant="outline" size="sm">
              Ver evento
            </Button>
            <Button href={buyHref} size="sm">
              Comprar boletas
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

async function FeaturedEvents({ events }: { events: readonly PublicEventCard[] }) {
  const featured = events.slice(0, 8);
  const lead = featured[0];
  const rest = featured.slice(1);
  const tickets = lead ? await listEventTicketTypes(lead.id) : [];
  const allHref = appWebHref("/") ?? "#descarga";

  return (
    <Section id="eventos" aria-labelledby="eventos-heading">
      <Container>
        <SectionHeading
          id="eventos-heading"
          eyebrow="Agenda"
          title="Lo que se vive ahora"
          description="Cartel, hora y precio. Entra a la ficha y compra la boleta."
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
            body="Cuando salga el próximo cartel, aparece aquí. Entra a la app para comprar o crear una fecha."
            action={
              <Button href={allHref} size="sm">
                Entrar a la app
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-ds-24">
            {lead ? <SpotlightEvent event={lead} tickets={tickets} /> : null}
            {rest.length > 0 ? (
              <div className="grid gap-ds-16 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((event, index) => (
                  <EventCard key={event.id} event={event} delayMs={index * 70} />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </Container>
    </Section>
  );
}

export { EventCard, FeaturedEvents };
