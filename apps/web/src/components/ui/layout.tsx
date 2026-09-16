import { cn } from "@/lib/utils";

function Container({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-page px-ds-16 sm:px-ds-24", className)}
      {...props}
    />
  );
}

type SectionProps = React.ComponentProps<"section"> & {
  band?: "paper" | "ink";
};

function Section({ className, band = "paper", ...props }: SectionProps) {
  return (
    <section
      className={cn(
        "py-ds-48 md:py-ds-80 scroll-mt-ds-80",
        band === "ink" && "bg-foreground text-background",
        className,
      )}
      {...props}
    />
  );
}

function Stack({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-ds-16", className)} {...props} />;
}

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-ds-24 flex flex-col gap-ds-12 md:mb-ds-32 md:flex-row md:items-end md:justify-between">
      <Stack className="items-start gap-ds-8">
        {eyebrow ? (
          <span className="font-favorit text-caption font-bold tracking-favorit text-aurora uppercase">
            {eyebrow}
          </span>
        ) : null}
        <h2 id={id} className="font-favorit text-[clamp(1.5rem,5vw,1.75rem)] font-bold tracking-tight text-foreground sm:text-heading">
          {title}
        </h2>
        {description ? (
          <p className="max-w-lg text-body-sm text-muted-foreground sm:text-body">{description}</p>
        ) : null}
      </Stack>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function EmptyPanel({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-ds-12 rounded-cards border border-dashed border-border bg-surface px-ds-32 py-ds-48 shadow-card">
      <p className="font-favorit text-subheading font-bold tracking-tight text-foreground">
        {title}
      </p>
      <p className="max-w-md text-body text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

export { Container, EmptyPanel, Section, SectionHeading, Stack };
