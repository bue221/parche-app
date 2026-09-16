"use client";

import { Moon, Sun } from "lucide-react";

import { applyTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar tema claro u oscuro"
      title="Cambiar tema"
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-foreground outline-none",
        "hover:bg-muted focus-visible:ring-2 focus-visible:ring-aurora",
        className,
      )}
    >
      <Sun aria-hidden className="hidden size-4 dark:block" />
      <Moon aria-hidden className="block size-4 dark:hidden" />
    </button>
  );
}

export { ThemeToggle };
