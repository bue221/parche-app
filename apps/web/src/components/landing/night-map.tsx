import { NightMapScene } from "@/components/landing/night-map-scene";
import { Button } from "@/components/ui/button";
import { Container, Section, Stack } from "@/components/ui/layout";
import { Text } from "@/components/ui/text";
import type { PublicEventCard } from "@/lib/events";
import { appWebHref } from "@/lib/site";

type LocatedEvent = PublicEventCard & { lat: number; lng: number };

function locatedEvents(events: readonly PublicEventCard[]): LocatedEvent[] {
  return events.filter(
    (event): event is LocatedEvent => event.lat != null && event.lng != null,
  );
}

function NightMap({ events }: { events: readonly PublicEventCard[] }) {
  const pins = locatedEvents(events);
  if (pins.length === 0) return null;

  const exploreHref = appWebHref("/explore") ?? "#eventos";

  return (
    <Section id="mapa" aria-labelledby="mapa-heading">
      <Container className="grid items-center gap-ds-32 md:grid-cols-2 md:gap-ds-48">
        <Stack className="items-start gap-ds-16">
          <span className="font-favorit text-caption font-bold tracking-favorit text-aurora uppercase">
            {`${pins.length} pines en el mapa`}
          </span>
          <Text as="h2" id="mapa-heading" variant="display" className="max-w-[12ch] text-[clamp(2.25rem,8vw,4.75rem)]">
            La noche, geolocalizada
          </Text>
          <Text variant="lead" className="max-w-md text-body-sm sm:text-body">
            Qué pasa cerca, en tiempo real. Cada pin es un evento con su crew y
            sus boletos.
          </Text>
          <Button href={exploreHref} variant="outline">
            Abrir mapa
          </Button>
        </Stack>
        <NightMapScene events={pins} />
      </Container>
    </Section>
  );
}

export { NightMap };
