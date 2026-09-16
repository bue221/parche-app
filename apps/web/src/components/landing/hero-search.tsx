"use client";

import { ChevronDown, Search } from "lucide-react";
import { type FormEvent } from "react";

import { Icon } from "@/components/ui/icon";
import { LANDING_CITIES } from "@/constants/cities";
import { cn } from "@/lib/utils";

function HeroSearch({
  actionHref,
  defaultCity,
}: {
  actionHref?: string;
  defaultCity: string;
}) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (actionHref) return;
    event.preventDefault();
    document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <form
      id="buscar"
      action={actionHref}
      method={actionHref ? "get" : undefined}
      onSubmit={onSubmit}
      className={cn(
        "search-pill flex w-full max-w-xl flex-col gap-ds-4 p-ds-8",
        "rounded-cards sm:flex-row sm:items-center sm:gap-ds-8 sm:rounded-full",
      )}
    >
      <label className="flex min-w-0 flex-1 items-center gap-ds-8 px-ds-12">
        <Icon as={Search} size={18} className="shrink-0 text-pitch-black/50" />
        <span className="sr-only">Buscar eventos, artistas o lugares</span>
        <input
          type="search"
          name="q"
          placeholder="Buscar eventos, artistas, lugares..."
          className="min-w-0 flex-1 bg-transparent py-ds-12 font-favorit text-body-sm outline-none sm:py-ds-8"
        />
      </label>
      <span className="mx-ds-12 h-px bg-pitch-black/10 sm:mx-0 sm:hidden" aria-hidden />
      <span className="hidden h-8 w-px bg-pitch-black/10 sm:block" aria-hidden />
      <label className="relative flex items-center gap-ds-8 px-ds-12 sm:max-w-40">
        <span className="sr-only">Ciudad</span>
        <select
          name="city"
          defaultValue={defaultCity}
          className="w-full appearance-none bg-transparent py-ds-12 pr-ds-20 font-favorit text-body-sm font-bold outline-none sm:py-ds-8"
        >
          {LANDING_CITIES.map((city) => (
            <option key={city.slug} value={city.slug}>
              {city.name}
            </option>
          ))}
        </select>
        <Icon
          as={ChevronDown}
          size={16}
          className="pointer-events-none absolute right-ds-12 text-pitch-black/45"
        />
      </label>
      <button
        type="submit"
        className={cn(
          "w-full rounded-full bg-pitch-black px-ds-20 py-ds-12 font-favorit text-caption font-bold tracking-favorit text-paper-white uppercase outline-none sm:w-auto",
          "hover:opacity-90 focus-visible:ring-2 focus-visible:ring-aurora",
        )}
      >
        Buscar
      </button>
    </form>
  );
}

export { HeroSearch };
