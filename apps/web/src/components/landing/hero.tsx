import type { CSSProperties } from "react";

import {
  FlyerColumn,
  LEFT_FLYERS,
  Marquee,
  RIGHT_FLYERS,
} from "@/components/landing/hero-atmosphere";
import { Button } from "@/components/ui/button";
import { Stack } from "@/components/ui/layout";
import { Tag } from "@/components/ui/tag";
import { Text } from "@/components/ui/text";
import { siteConfig } from "@/lib/site";

const GENRES = ["Concierto", "Club", "Festival", "Teatro", "Fiesta"] as const;

function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[calc(100svh-5rem)] flex-col overflow-x-hidden"
    >
      <Marquee />
      <div className="mx-auto grid w-full max-w-page flex-1 grid-cols-1 px-ds-24 py-ds-24 lg:grid-cols-[8rem_minmax(0,1fr)_8rem] lg:gap-ds-16 xl:grid-cols-[13rem_minmax(0,1fr)_13rem] xl:gap-ds-24">
        <FlyerColumn flyers={LEFT_FLYERS} align="start" />
        <Stack className="mx-auto w-full max-w-xl items-center self-center text-center">
          <div className="flex flex-wrap items-center justify-center gap-ds-8 animate-parche-fade">
            <Tag>App de eventos en vivo</Tag>
            <Tag className="border-foreground bg-foreground text-background animate-parche-blink">
              Live
            </Tag>
          </div>
          <Text
            as="h1"
            id="hero-heading"
            variant="display"
            className="max-w-[14ch] uppercase"
          >
            <span
              className="block animate-parche-stamp"
              style={{ animationDelay: "80ms" }}
            >
              Welcome
            </span>
            <span
              className="block animate-parche-stamp"
              style={{ animationDelay: "170ms" }}
            >
              to the
            </span>
            <span className="hero-parche-line block">Parche</span>
          </Text>
          <Text
            variant="lead"
            className="max-w-md animate-parche-rise"
            style={{ animationDelay: "360ms" }}
          >
            Encuentra conciertos, rumba y teatro en tu ciudad. Escoge la noche
            y confirma que vas.
          </Text>
          <div
            className="mt-ds-8 flex flex-wrap items-center justify-center gap-ds-12 animate-parche-rise"
            style={{ animationDelay: "440ms" }}
          >
            <Button href={siteConfig.appWebUrl ?? "#descarga"}>
              {siteConfig.appWebUrl ? "Abrir la app" : "Descargar la app"}
            </Button>
            <Button href="#eventos" variant="outline">
              Ver eventos
            </Button>
          </div>
          <ul className="mt-ds-16 flex flex-wrap justify-center gap-ds-8">
            {GENRES.map((genre, index) => (
              <li
                key={genre}
                className="animate-parche-float"
                style={
                  {
                    animationDelay: `${index * 220}ms`,
                    "--tilt": `${index % 2 === 0 ? -6 : 5}deg`,
                  } as CSSProperties
                }
              >
                <Tag className="border-border text-muted-foreground">
                  {genre}
                </Tag>
              </li>
            ))}
          </ul>
        </Stack>
        <FlyerColumn flyers={RIGHT_FLYERS} align="end" />
      </div>
      <Marquee reverse />
    </section>
  );
}

export { Hero };
