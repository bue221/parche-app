"use client";

import { List, Map as MapIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function MapToggleFab({
  mode,
  onToggle,
  className,
}: {
  mode: "list" | "map";
  onToggle: () => void;
  className?: string;
}) {
  const label = mode === "list" ? "Mostrar mapa" : "Mostrar lista";
  const Icon = mode === "list" ? MapIcon : List;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex min-h-12 items-center gap-ds-8 rounded-full bg-foreground px-ds-20 py-ds-12 font-favorit text-body-sm font-bold text-background shadow-[0_8px_28px_rgb(0_0_0/0.28)] outline-none",
        "hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-aurora focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      aria-label={label}
    >
      <Icon size={16} aria-hidden />
      {label}
    </button>
  );
}

export { MapToggleFab };
