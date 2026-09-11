import { cn } from "@/lib/utils";

const MARQUEE = [
  "Rumba",
  "4AM",
  "Live",
  "Bogotá",
  "Medellín",
  "Cali",
  "Concierto",
  "Club",
  "Festival",
  "VIP",
  "Parche",
  "En vivo",
] as const;

type Flyer = {
  title: string;
  meta: string;
  className: string;
  delay: string;
};

const LEFT_FLYERS: readonly Flyer[] = [
  {
    title: "4AM",
    meta: "Club",
    className: "h-36 w-full bg-confirm text-pitch-black [--tilt:-12deg]",
    delay: "0s",
  },
  {
    title: "VIP",
    meta: "Lista",
    className: "h-32 w-[85%] bg-foreground text-background [--tilt:10deg]",
    delay: "1.1s",
  },
];

const RIGHT_FLYERS: readonly Flyer[] = [
  {
    title: "Live",
    meta: "Tonight",
    className:
      "ml-auto h-40 w-full bg-pitch-black text-paper-white ring-1 ring-foreground [--tilt:8deg]",
    delay: "0.6s",
  },
  {
    title: "Rumba",
    meta: "Cali",
    className: "ml-auto h-36 w-[90%] bg-ash-gray text-pitch-black [--tilt:-7deg]",
    delay: "1.8s",
  },
];

function Marquee({ reverse = false }: { reverse?: boolean }) {
  const items = [...MARQUEE, ...MARQUEE];

  return (
    <div
      aria-hidden
      className="overflow-hidden border-y border-border bg-background"
    >
      <div
        className={cn(
          "flex w-max gap-ds-24 py-ds-8",
          reverse ? "animate-parche-marquee-rev" : "animate-parche-marquee",
        )}
      >
        {items.map((word, index) => (
          <span
            key={`${word}-${index}`}
            className="font-favorit text-caption font-bold tracking-favorit text-muted-foreground uppercase"
          >
            {word}
            <span className="ml-ds-24 text-foreground">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function FlyerCard({ title, meta, className, delay }: Flyer) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-images p-ds-12 font-foggy uppercase animate-parche-float",
        className,
      )}
      style={{ animationDelay: delay }}
    >
      <span className="font-favorit text-[10px] font-bold tracking-favorit">
        {meta}
      </span>
      <span className="text-4xl leading-[0.83]">{title}</span>
    </div>
  );
}

function FlyerColumn({
  flyers,
  align,
}: {
  flyers: readonly Flyer[];
  align: "start" | "end";
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "hidden min-h-0 flex-col justify-between self-stretch py-ds-8 lg:flex",
        align === "end" && "items-end",
      )}
    >
      {flyers.map((flyer) => (
        <FlyerCard key={flyer.title} {...flyer} />
      ))}
    </div>
  );
}

export { FlyerColumn, LEFT_FLYERS, Marquee, RIGHT_FLYERS };
