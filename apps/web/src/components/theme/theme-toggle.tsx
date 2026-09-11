"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { applyTheme } from "@/lib/theme";

function ThemeToggle() {
  function toggle() {
    const next = document.documentElement.classList.contains("dark")
      ? "light"
      : "dark";
    applyTheme(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Cambiar tema claro u oscuro"
      title="Cambiar tema"
    >
      <Icon as={Sun} size={16} className="hidden dark:block" />
      <Icon as={Moon} size={16} className="block dark:hidden" />
    </Button>
  );
}

export { ThemeToggle };
