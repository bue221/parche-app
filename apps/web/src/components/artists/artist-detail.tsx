import Image from "next/image";
import Link from "next/link";

import { EventCard } from "@/components/events/event-card";
import { Button } from "@/components/ui/button";
import { Container, EmptyPanel } from "@/components/ui/layout";
import { Text } from "@/components/ui/text";
import type { PublicArtist } from "@/lib/artists";
import { appWebHref } from "@/lib/site";

function ArtistDetail({ artist }: { artist: PublicArtist }) {
  const appHref = appWebHref(`/artist/${artist.id}`) ?? "/#descarga";
  const avatar = artist.avatar?.publicUrl ?? artist.avatar?.thumbUrl;

  return (
    <article className="flex flex-1 flex-col py-ds-32 md:py-ds-48">
      <Container className="flex flex-col gap-ds-32">
        <header className="flex flex-col gap-ds-16 sm:flex-row sm:items-end sm:gap-ds-24">
          <div className="relative size-28 shrink-0 overflow-hidden rounded-full bg-muted sm:size-36">
            {avatar ? (
              <Image
                src={avatar}
                alt=""
                fill
                sizes="144px"
                className="object-cover"
              />
            ) : (
              <span className="flex h-full items-center justify-center font-favorit text-heading font-bold">
                {artist.name.slice(0, 1)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-favorit text-caption font-bold tracking-favorit text-aurora uppercase">
              Artista
            </p>
            <Text as="h1" variant="display" className="mt-ds-4 text-[clamp(2rem,5vw,3rem)]">
              {artist.name}
            </Text>
            {artist.followersCount > 0 ? (
              <p className="mt-ds-8 text-body-sm text-muted-foreground">
                {artist.followersCount === 1
                  ? "1 seguidor"
                  : `${artist.followersCount} seguidores`}
              </p>
            ) : null}
            {artist.bio ? (
              <Text className="mt-ds-12 max-w-2xl whitespace-pre-wrap">
                {artist.bio}
              </Text>
            ) : null}
            <div className="mt-ds-16 flex flex-wrap gap-ds-12">
              <Button href={appHref}>Abrir en la app</Button>
              {artist.links.instagram ? (
                <Button href={artist.links.instagram} variant="outline">
                  Instagram
                </Button>
              ) : null}
              {artist.links.soundcloud ? (
                <Button href={artist.links.soundcloud} variant="outline">
                  SoundCloud
                </Button>
              ) : null}
            </div>
          </div>
        </header>

        <section aria-labelledby="proximas-heading" className="flex flex-col gap-ds-16">
          <h2
            id="proximas-heading"
            className="font-favorit text-subheading font-bold tracking-tight"
          >
            Próximas fechas
          </h2>
          {artist.upcoming.length === 0 ? (
            <EmptyPanel
              title="Sin fechas publicadas"
              body="Cuando este artista tenga un parche, aparece aquí."
              action={
                <Button href="/explorar" size="sm" variant="outline">
                  Explorar agenda
                </Button>
              }
            />
          ) : (
            <div className="grid gap-ds-16 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {artist.upcoming.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  variant="listing"
                  delayMs={index * 40}
                  sizes="(min-width: 1280px) 20vw, (min-width: 640px) 40vw, 90vw"
                />
              ))}
            </div>
          )}
        </section>

        <p className="text-body-sm text-muted-foreground">
          <Link href="/explorar" className="underline hover:text-aurora">
            Ver toda la agenda
          </Link>
        </p>
      </Container>
    </article>
  );
}

export { ArtistDetail };
