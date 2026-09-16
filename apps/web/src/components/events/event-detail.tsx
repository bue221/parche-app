import Image from "next/image";

import { EventAudioPlayer } from "@/components/events/event-audio-player";
import { EventCard } from "@/components/landing/featured-events";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { Tag } from "@/components/ui/tag";
import { Text } from "@/components/ui/text";
import {
  googleMapsHref,
  type PublicEvent,
  type PublicEventCard,
} from "@/lib/events";
import {
  formatEventRange,
  formatEventTime,
  statusLabel,
} from "@/lib/format";
import { appWebHref } from "@/lib/site";

function EventDetail({
  event,
  similar,
}: {
  event: PublicEvent;
  similar: PublicEventCard[];
}) {
  const cancelled = event.status === "cancelled";
  const appHref = appWebHref(`/event/${event.id}`) ?? "/#descarga";
  const place = [event.venueName, event.addressText].filter(Boolean).join(" · ");
  const mapHref =
    event.lat != null && event.lng != null
      ? googleMapsHref(event.lat, event.lng)
      : undefined;
  const flyer = event.flyer?.publicUrl ?? event.flyer?.thumbUrl;

  return (
    <article className="flex flex-1 flex-col">
      <Container className="grid flex-1 gap-ds-32 py-ds-32 md:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] md:items-start md:gap-ds-48 md:py-ds-48">
        <div className="flex flex-col gap-ds-16">
          <div className="overflow-hidden rounded-images bg-muted">
            {flyer ? (
              <Image
                src={flyer}
                alt={`Flyer de ${event.title}`}
                width={880}
                height={1100}
                className="aspect-4/5 h-auto w-full object-cover"
                sizes="(min-width: 768px) 28rem, 100vw"
                priority
              />
            ) : (
              <div className="flex aspect-4/5 items-center justify-center bg-muted">
                <Text variant="heading" className="uppercase">
                  {event.title.slice(0, 2)}
                </Text>
              </div>
            )}
          </div>
          {event.gallery.length > 0 ? (
            <ul className="flex gap-ds-8 overflow-x-auto">
              {event.gallery.map((image) => {
                const src = image.thumbUrl ?? image.publicUrl;
                return (
                  <li
                    key={image.id}
                    className="relative h-24 w-20 shrink-0 overflow-hidden rounded-images bg-muted"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col gap-ds-16 pb-ds-120">
          <div className="flex flex-wrap gap-ds-8">
            <Tag tone={cancelled ? "danger" : "aurora"}>
              {statusLabel(event.status)}
            </Tag>
            {event.genres.map((genre) => (
              <Tag key={genre} tone="muted">
                {genre}
              </Tag>
            ))}
          </div>

          <Text variant="caption" className="uppercase text-muted-foreground">
            {formatEventRange(event.startsAt, event.endsAt)}
          </Text>
          <Text as="h1" variant="heading">
            {event.title}
          </Text>
          {place ? <Text variant="muted">{place}</Text> : null}
          {mapHref ? (
            <Button href={mapHref} variant="outline" size="sm" className="self-start">
              Abrir en Google Maps
            </Button>
          ) : null}
          {event.agePolicy ? (
            <Text variant="helper">{event.agePolicy}</Text>
          ) : null}
          {event.description ? (
            <Text className="max-w-xl whitespace-pre-wrap">
              {event.description}
            </Text>
          ) : null}

          {event.lineup.length > 0 ? (
            <div className="mt-ds-8 flex flex-col gap-ds-8">
              <Text variant="caption" className="uppercase text-muted-foreground">
                Lineup
              </Text>
              <ul className="flex flex-col gap-ds-8">
                {event.lineup.map((slot) => {
                  const avatar = slot.avatar?.thumbUrl ?? slot.avatar?.publicUrl;
                  const initials = slot.name.slice(0, 2).toUpperCase();
                  return (
                    <li
                      key={`${slot.artistId}-${slot.billingOrder}`}
                      className="flex min-h-11 items-center gap-ds-12"
                    >
                      {avatar ? (
                        <Image
                          src={avatar}
                          alt=""
                          width={48}
                          height={48}
                          className="size-12 rounded-full bg-muted object-cover"
                        />
                      ) : (
                        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
                          <Text variant="caption" className="font-bold">
                            {initials}
                          </Text>
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <Text>{slot.name}</Text>
                        {slot.startsAt ? (
                          <Text variant="muted">
                            {formatEventTime(slot.startsAt)}
                          </Text>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {event.tracks.length > 0 ? (
            <EventAudioPlayer tracks={event.tracks} />
          ) : null}
        </div>
      </Container>

      {similar.length > 0 ? (
        <Container className="pb-ds-48">
          <div className="flex flex-col gap-ds-16">
            <Text as="h2" variant="headingSm">
              Más como este
            </Text>
            <div className="grid gap-ds-24 sm:grid-cols-2 md:grid-cols-3">
              {similar.slice(0, 6).map((card, index) => (
                <EventCard key={card.id} event={card} delayMs={index * 90} />
              ))}
            </div>
          </div>
        </Container>
      ) : null}

      <div className="sticky bottom-0 z-40 border-t border-border bg-glass backdrop-blur-xl">
        <Container className="flex flex-wrap items-center justify-between gap-ds-12 py-ds-16">
          <Text variant="muted" className="max-w-sm">
            {cancelled
              ? "Esta fecha se canceló. Ábrela en la app para más detalle."
              : "Compra, QR y puerta viven en la app."}
          </Text>
          <Button href={appHref}>Abrir en la app</Button>
        </Container>
      </div>
    </article>
  );
}

export { EventDetail };
