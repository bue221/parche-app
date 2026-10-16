import Image from "next/image";

import { Reveal } from "@/components/motion/reveal";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { Text } from "@/components/ui/text";
import type { PublicEventCard } from "@/lib/events";
import { trendingArtists } from "@/lib/landing";
import { appWebHref } from "@/lib/site";

function TrendingArtists({ events }: { events: readonly PublicEventCard[] }) {
  const artists = trendingArtists(events);
  if (artists.length === 0) return null;
  const allHref = appWebHref("/") ?? "#eventos";

  return (
    <Section id="artistas" aria-labelledby="artistas-heading" className="pt-0">
      <Container>
        <SectionHeading
          id="artistas-heading"
          title="Artistas en tendencia"
          description="Descubre quién está moviendo la escena."
          action={
            <a
              href={allHref}
              className="font-favorit text-body-sm text-muted-foreground outline-none hover:text-aurora focus-visible:ring-2 focus-visible:ring-aurora"
            >
              Ver todos
            </a>
          }
        />
        <ul className="flex gap-ds-20 overflow-x-auto pb-ds-8 scrollbar-none">
          {artists.map((artist, index) => (
            <Reveal as="li" key={artist.key} delayMs={index * 60} className="shrink-0">
              <a
                href={allHref}
                className="flex w-24 flex-col items-center gap-ds-8 outline-none focus-visible:ring-2 focus-visible:ring-aurora rounded-cards"
              >
                <span className="relative size-20 overflow-hidden rounded-full bg-muted ring-2 ring-border">
                  {artist.avatarUrl ? (
                    <Image
                      src={artist.avatarUrl}
                      alt=""
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center font-favorit text-heading-sm font-bold">
                      {artist.name.slice(0, 1)}
                    </span>
                  )}
                </span>
                <Text as="span" variant="bodySm" className="line-clamp-2 text-center">
                  {artist.name}
                </Text>
              </a>
            </Reveal>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

export { TrendingArtists };
