import { cn } from "@/lib/utils";

function Tag({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-tags border border-foreground px-ds-12 py-ds-4 font-favorit text-caption font-bold tracking-favorit uppercase",
        className,
      )}
      {...props}
    />
  );
}

export { Tag };
