import { Reveal } from "@/components/motion/reveal";
import { Container, Section, Stack } from "@/components/ui/layout";
import { Tag } from "@/components/ui/tag";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type EventPoster = {
  id: string;
  title: string;
  venue: string;
  city: string;
  date: string;
  genre: string;
  art: "ink" | "paper" | "confirm";
};

const EVENTS: EventPoster[] = [
  {
    id: "sala-negra",
    title: "Sala Negra",
    venue: "Teatro Amnesia",
    city: "Bogotá",
    date: "12 Sep",
    genre: "Concierto",
    art: "ink",
  },
  {
    id: "rumba-4am",
    title: "Rumba 4AM",
    venue: "Club Horario",
    city: "Medellín",
    date: "18 Sep",
    genre: "Club",
    art: "confirm",
  },
  {
    id: "teatro-abierto",
    title: "Teatro Abierto",
    venue: "Casa del Río",
    city: "Cali",
    date: "21 Sep",
    genre: "Teatro",
    art: "paper",
  },
];

function PosterArt({ event }: { event: EventPoster }) {
  const surface =
    event.art === "ink"
      ? "bg-pitch-black text-paper-white ring-1 ring-foreground"
      : event.art === "confirm"
        ? "bg-confirm text-pitch-black"
        : "bg-ash-gray text-pitch-black";

  return (
    <div
      className={cn(
        "relative flex aspect-3/4 flex-col justify-between overflow-hidden rounded-images p-ds-16",
        surface,
      )}
    >
      <span className="font-favorit text-caption font-bold tracking-favorit uppercase motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-parche motion-safe:group-hover:translate-x-1">
        {event.genre}
      </span>
      <p className="origin-left font-foggy text-[clamp(3rem,8vw,4.5rem)] leading-[0.83] uppercase motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-parche motion-safe:group-hover:scale-[1.04]">
        {event.title}
      </p>
      <span className="font-favorit text-caption font-bold tracking-favorit uppercase">
        {event.date} · {event.city}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-ds-16 bottom-ds-12 h-px origin-left scale-x-0 bg-current motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-parche motion-safe:group-hover:scale-x-100"
      />
    </div>
  );
}

function EventCard({
  event,
  delayMs,
}: {
  event: EventPoster;
  delayMs: number;
}) {
  return (
    <Reveal as="article" delayMs={delayMs} className="group flex flex-col gap-ds-8">
      <div className="motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-parche motion-safe:group-hover:-translate-y-1.5">
        <PosterArt event={event} />
      </div>
      <div className="flex flex-col gap-ds-4">
        <Text as="h3" variant="headingSm">
          {event.title}
        </Text>
        <Text variant="muted">
          {event.venue} · {event.city}
        </Text>
      </div>
    </Reveal>
  );
}

function FeaturedEvents() {
  return (
    <Section id="eventos" aria-labelledby="eventos-heading">
      <Container>
        <Reveal>
          <Stack className="mb-ds-32 items-start gap-ds-8">
            <Tag>Esta semana</Tag>
            <Text as="h2" id="eventos-heading" variant="heading">
              Qué hay para armar parche
            </Text>
            <Text variant="lead" className="max-w-lg">
              Conciertos, clubes y teatro en Bogotá, Medellín y Cali. Lo que
              está pasando, no un scroll infinito.
            </Text>
          </Stack>
        </Reveal>
        <div className="grid gap-ds-24 md:grid-cols-3">
          {EVENTS.map((event, index) => (
            <EventCard key={event.id} event={event} delayMs={index * 90} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

export { FeaturedEvents };
