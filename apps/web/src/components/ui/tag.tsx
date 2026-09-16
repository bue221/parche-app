import { cn } from "@/lib/utils";

type TagTone =
  | "ink"
  | "muted"
  | "glass"
  | "heat"
  | "aurora"
  | "confirm"
  | "amber"
  | "danger";

const TONE: Record<TagTone, string> = {
  ink: "border-foreground bg-transparent text-foreground",
  muted: "border-border bg-muted text-muted-foreground",
  glass:
    "border-white/20 bg-pitch-black/55 text-paper-white backdrop-blur-md",
  heat: "border-aurora bg-aurora text-pitch-black",
  aurora: "border-aurora bg-aurora text-pitch-black",
  confirm: "border-confirm bg-confirm text-pitch-black",
  amber: "border-amber bg-amber text-pitch-black",
  danger: "border-danger bg-danger text-pitch-black",
};

function Tag({
  className,
  tone = "ink",
  ...props
}: React.ComponentProps<"span"> & { tone?: TagTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center self-start rounded-tags border px-ds-12 py-ds-4 font-favorit text-caption font-bold tracking-favorit uppercase",
        TONE[tone],
        className,
      )}
      {...props}
    />
  );
}

export { Tag };
export type { TagTone };
