import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { Tag } from "@/components/ui/tag";
import { eventPath, type PublicEventCard } from "@/lib/events";
import {
  ageLabel,
  formatEventDay,
  formatEventPosterBadge,
} from "@/lib/format";
import { firstGenre, flyerSrc, placeLine } from "@/lib/landing";
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
  selected = false,
  badge,
  caption,
  className,
  variant = "poster",
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  onHover,
}: {
  event: PublicEventCard;
  delayMs?: number;
  selected?: boolean;
  badge?: string;
  caption?: string;
  className?: string;
  variant?: "poster" | "listing";
  sizes?: string;
  onHover?: (id: string | null) => void;
}) {
  if (variant === "listing") {
    return (
      <ListingCard
        event={event}
        delayMs={delayMs}
        selected={selected}
        className={className}
        sizes={sizes}
        onHover={onHover}
      />
    );
  }

  const flyer = flyerSrc(event);
  const place = placeLine(event);
  const genre = firstGenre(event);
  const age = ageLabel(event.agePolicy);

  return (
    <Reveal as="article" delayMs={delayMs} className={cn("group h-full", className)}>
      <Link
        href={eventPath(event.id)}
        className={cn(
          "relative flex aspect-4/5 h-full flex-col overflow-hidden rounded-cards bg-surface shadow-card outline-none",
          "focus-visible:ring-2 focus-visible:ring-aurora",
          selected && "ring-2 ring-aurora",
        )}
      >
        <div className="absolute inset-0">
          {flyer ? (
            <Image
              src={flyer}
              alt=""
              fill
              sizes={sizes}
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
        {badge ? (
          <span className="absolute top-ds-12 right-ds-12 z-10 rounded-full bg-aurora px-ds-8 py-ds-4 font-favorit text-[10px] font-bold tracking-favorit text-pitch-black uppercase">
            {badge}
          </span>
        ) : (
          <span
            aria-hidden
            className="absolute top-ds-12 right-ds-12 z-10 flex size-9 items-center justify-center rounded-full bg-pitch-black/55 text-paper-white backdrop-blur-md"
          >
            <Heart size={14} />
          </span>
        )}
        <div className="relative z-10 mt-auto flex flex-col gap-ds-8 p-ds-16 text-paper-white">
          <h3 className="line-clamp-2 font-favorit text-subheading font-bold tracking-tight">
            {event.title}
          </h3>
          {place ? (
            <p className="line-clamp-1 text-caption font-normal tracking-normal text-paper-white/75">
              {place}
            </p>
          ) : null}
          {caption ? (
            <p className="line-clamp-1 text-caption font-bold tracking-favorit text-aurora uppercase">
              {caption}
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

/** Airbnb-style: photo on top, meta below (no scrim overlay). */
function ListingCard({
  event,
  delayMs,
  selected,
  className,
  sizes,
  onHover,
}: {
  event: PublicEventCard;
  delayMs: number;
  selected: boolean;
  className?: string;
  sizes: string;
  onHover?: (id: string | null) => void;
}) {
  const flyer = flyerSrc(event);
  const place = placeLine(event);
  const genre = firstGenre(event);

  return (
    <Reveal as="article" delayMs={delayMs} className={cn("group", className)}>
      <Link
        href={eventPath(event.id)}
        onMouseEnter={() => onHover?.(event.id)}
        onMouseLeave={() => onHover?.(null)}
        onFocus={() => onHover?.(event.id)}
        onBlur={() => onHover?.(null)}
        className={cn(
          "flex flex-col gap-ds-12 outline-none",
          "focus-visible:rounded-cards focus-visible:ring-2 focus-visible:ring-aurora",
        )}
      >
        <div
          className={cn(
            "relative aspect-[20/19] overflow-hidden rounded-2xl bg-muted",
            selected && "ring-2 ring-aurora ring-offset-2 ring-offset-background",
          )}
        >
          {flyer ? (
            <Image
              src={flyer}
              alt=""
              fill
              sizes={sizes}
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-end p-ds-16">
              <span className="font-favorit text-subheading font-bold tracking-tight text-foreground">
                {event.title}
              </span>
            </div>
          )}
          <span
            aria-hidden
            className="absolute top-ds-12 right-ds-12 z-10 flex size-8 items-center justify-center rounded-full bg-paper-white/90 text-pitch-black shadow-sm backdrop-blur-sm"
          >
            <Heart size={14} />
          </span>
        </div>
        <div className="flex flex-col gap-ds-4 px-0.5">
          <div className="flex items-start justify-between gap-ds-8">
            <h3 className="line-clamp-1 font-favorit text-body-sm font-bold tracking-tight text-foreground">
              {event.title}
            </h3>
            {genre ? (
              <span className="shrink-0 font-favorit text-caption font-bold tracking-favorit text-muted-foreground uppercase">
                {genre}
              </span>
            ) : null}
          </div>
          {place ? (
            <p className="line-clamp-1 text-body-sm text-muted-foreground">
              {place}
            </p>
          ) : null}
          <p className="text-body-sm text-muted-foreground">
            {formatEventDay(event.startsAt)}
          </p>
        </div>
      </Link>
    </Reveal>
  );
}

export { EventCard };
