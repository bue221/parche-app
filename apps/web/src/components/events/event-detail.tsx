import Image from "next/image";
import { Calendar, MapPin, Users } from "lucide-react";

import { EventAudioPlayer } from "@/components/events/event-audio-player";
import { EventCard } from "@/components/events/event-card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";
import { Tag } from "@/components/ui/tag";
import { Text } from "@/components/ui/text";
import {
  googleMapsHref,
  lowestOnSale,
  ticketLeft,
  ticketOnSale,
  type PublicEvent,
  type PublicEventCard,
  type PublicTicketType,
} from "@/lib/events";
import {
  eventHasEnded,
  formatEventLongDate,
  formatEventTime,
  formatMoney,
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
  const ended = !cancelled && eventHasEnded(event);
  const appHref = appWebHref(`/event/${event.id}`) ?? "/#descarga";
  const venue = event.venueName?.trim() || undefined;
  const address = event.addressText?.trim() || undefined;
  const mapHref =
    event.lat != null && event.lng != null
      ? googleMapsHref(event.lat, event.lng)
      : undefined;
  const flyer = event.flyer?.publicUrl ?? event.flyer?.thumbUrl;
  const onSale = cancelled || ended ? [] : event.ticketTypes.filter(ticketOnSale);
  const lowest = lowestOnSale(onSale);
  const remaining = onSale.reduce((sum, type) => sum + ticketLeft(type), 0);
  const scarce = remaining > 0 && remaining <= 12;
  const priceLabel = cancelled
    ? "Cancelado"
    : ended
      ? "Finalizado"
      : lowest
        ? formatMoney(lowest.priceCents, lowest.currency)
        : event.ticketTypes.some((type) => type.status === "sold_out")
          ? "Agotado"
          : "Pronto";
  const ctaLabel = cancelled
    ? "Ver en la app"
    : ended
      ? "Ver ficha"
      : onSale.length > 0
        ? "Comprar boletas"
        : "Abrir en la app";
  const stickyLead = cancelled
    ? "Esta fecha se canceló."
    : ended
      ? "La noche ya pasó. La ficha sigue en la app."
      : onSale.length > 0
        ? "Paga en la app. El QR queda en tu wallet."
        : "Compra, QR y puerta viven en la app.";

  return (
    <article className="flex flex-1 flex-col">
      <Container className="grid flex-1 gap-ds-32 py-ds-24 md:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] md:items-start md:gap-ds-48 md:py-ds-40">
        <div className="flex flex-col gap-ds-16 md:sticky md:top-ds-80">
          <div className="relative overflow-hidden rounded-images bg-muted shadow-card">
            {flyer ? (
              <Image
                src={flyer}
                alt={`Flyer de ${event.title}`}
                width={880}
                height={1100}
                className="aspect-4/5 h-auto w-full object-cover"
                sizes="(min-width: 768px) 26rem, 100vw"
                priority
              />
            ) : (
              <div className="flex aspect-4/5 items-center justify-center bg-muted">
                <Text variant="heading" className="uppercase">
                  {event.title.slice(0, 2)}
                </Text>
              </div>
            )}
            {event.genres[0] ? (
              <span className="absolute top-ds-12 left-ds-12 z-10">
                <Tag tone="glass">{event.genres[0]}</Tag>
              </span>
            ) : null}
          </div>
          {event.gallery.length > 0 ? (
            <ul className="flex gap-ds-8 overflow-x-auto pb-ds-4 scrollbar-none">
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

        <div className="flex flex-col gap-ds-24 pb-ds-120">
          <div className="flex flex-col gap-ds-12">
            <div className="flex flex-wrap gap-ds-8">
              {cancelled || event.status !== "published" ? (
                <Tag tone={cancelled ? "danger" : "muted"}>
                  {statusLabel(event.status)}
                </Tag>
              ) : ended ? (
                <Tag tone="muted">Finalizado</Tag>
              ) : onSale.length > 0 ? (
                <Tag tone="aurora">Boletas a la venta</Tag>
              ) : (
                <Tag tone="amber">Pronto</Tag>
              )}
              {event.genres.slice(cancelled ? 0 : 1).map((genre) => (
                <Tag key={genre} tone="muted">
                  {genre}
                </Tag>
              ))}
            </div>
            <Text as="h1" variant="heading" className="max-w-xl text-[clamp(1.75rem,4vw,2.5rem)]">
              {event.title}
            </Text>
            {event.lineup.length > 0 ? (
              <Text variant="muted" className="max-w-xl">
                {event.lineup.map((slot) => slot.name).join(" · ")}
              </Text>
            ) : null}
          </div>

          <dl className="grid gap-ds-12 sm:grid-cols-3">
            <Fact
              icon={Calendar}
              label="Cuándo"
              value={formatEventLongDate(event.startsAt)}
              hint={`${formatEventTime(event.startsAt)}${event.endsAt ? ` – ${formatEventTime(event.endsAt)}` : ""}`}
            />
            <Fact
              icon={MapPin}
              label="Dónde"
              value={venue ?? "Por confirmar"}
              hint={address}
            />
            <Fact
              icon={Users}
              label="Edad"
              value={event.agePolicy?.trim() || "Todas las edades"}
              hint={scarce ? `${remaining} boletas` : undefined}
            />
          </dl>

          {mapHref ? (
            <Button href={mapHref} variant="outline" size="sm" className="self-start">
              Cómo llegar
            </Button>
          ) : null}

          <TicketPanel
            cancelled={cancelled}
            ended={ended}
            types={event.ticketTypes}
            lowest={lowest}
            appHref={appHref}
            ctaLabel={ctaLabel}
          />

          {event.description ? (
            <div className="flex flex-col gap-ds-8">
              <Text as="h2" variant="subheading">
                Sobre el evento
              </Text>
              <Text className="max-w-xl whitespace-pre-wrap">
                {event.description}
              </Text>
            </div>
          ) : null}

          {event.lineup.length > 0 ? (
            <div className="flex flex-col gap-ds-12">
              <Text as="h2" variant="subheading">
                Artistas
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
              Sigue el parche
            </Text>
            <div className="grid gap-ds-24 sm:grid-cols-2 md:grid-cols-3">
              {similar.slice(0, 6).map((card, index) => (
                <EventCard key={card.id} event={card} delayMs={index * 90} />
              ))}
            </div>
          </div>
        </Container>
      ) : null}

      <div className="sticky bottom-0 z-40 border-t border-border bg-glass-strong backdrop-blur-xl">
        <Container className="flex flex-wrap items-center justify-between gap-ds-12 py-ds-12">
          <div className="min-w-0">
            <Text variant="caption" className="uppercase text-muted-foreground">
              {cancelled ? "Estado" : ended ? "Cerrado" : onSale.length > 0 ? "Desde" : "Boleta"}
            </Text>
            <Text variant="headingSm">{priceLabel}</Text>
            <Text variant="helper" className="mt-ds-4 max-w-sm normal-case">
              {stickyLead}
            </Text>
          </div>
          <Button href={appHref} size="lg" className="shrink-0">
            {ctaLabel}
          </Button>
        </Container>
      </div>
    </article>
  );
}

function Fact({
  icon,
  label,
  value,
  hint,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-ds-8 rounded-cards border border-border bg-surface p-ds-16 shadow-card">
      <span className="flex size-8 items-center justify-center rounded-full bg-aurora-soft">
        <Icon as={icon} size={14} className="text-aurora" />
      </span>
      <div>
        <Text variant="caption" className="uppercase text-muted-foreground">
          {label}
        </Text>
        <Text variant="subheading" className="mt-ds-4">
          {value}
        </Text>
        {hint ? (
          <Text variant="muted" className="mt-ds-4">
            {hint}
          </Text>
        ) : null}
      </div>
    </div>
  );
}

function TicketPanel({
  cancelled,
  ended,
  types,
  lowest,
  appHref,
  ctaLabel,
}: {
  cancelled: boolean;
  ended: boolean;
  types: PublicTicketType[];
  lowest?: PublicTicketType;
  appHref: string;
  ctaLabel: string;
}) {
  const rows = types.length > 0 ? types : [];
  const emptyCopy = cancelled
    ? "Esta fecha no está a la venta."
    : ended
      ? "La venta ya cerró."
      : "Aún no hay boletas a la venta.";

  return (
    <section
      aria-labelledby="boletas-heading"
      className="flex flex-col gap-ds-16 rounded-cards border border-border bg-surface p-ds-20 shadow-card"
    >
      <div className="flex flex-wrap items-end justify-between gap-ds-12">
        <div>
          <Text as="h2" id="boletas-heading" variant="subheading">
            Boletas
          </Text>
          <Text variant="muted">
            {lowest
              ? `Desde ${formatMoney(lowest.priceCents, lowest.currency)}. Un pago por evento.`
              : emptyCopy}
          </Text>
        </div>
        {!cancelled ? (
          <Button href={appHref} size="sm">
            {ctaLabel}
          </Button>
        ) : null}
      </div>
      {rows.length > 0 ? (
        <ul className="flex flex-col gap-ds-8">
          {rows.map((type) => {
            const live = !cancelled && !ended && ticketOnSale(type);
            const left = ticketLeft(type);
            const soldOut = type.status === "sold_out" || left === 0;
            return (
              <li
                key={type.id}
                className="flex items-center justify-between gap-ds-12 rounded-cards border border-border bg-muted/70 px-ds-16 py-ds-12"
              >
                <div className="min-w-0">
                  <Text className="font-bold">{type.name}</Text>
                  <Text variant="muted">
                    {cancelled || ended
                      ? "No disponible"
                      : soldOut
                        ? "Agotada"
                        : live
                          ? `${left} disponibles`
                          : "Pronto"}
                  </Text>
                </div>
                <Text variant="subheading">
                  {formatMoney(type.priceCents, type.currency)}
                </Text>
              </li>
            );
          })}
        </ul>
      ) : (
        <Text variant="muted">{emptyCopy}</Text>
      )}
    </section>
  );
}

export { EventDetail };
