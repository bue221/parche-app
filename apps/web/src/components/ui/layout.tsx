import { cn } from "@/lib/utils";

function Container({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-page px-ds-24", className)}
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

export { Container, Section, Stack };
