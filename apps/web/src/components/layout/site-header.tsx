import Link from "next/link";
import { Search } from "lucide-react";

import { BrandMark } from "@/components/brand/mark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { appWebHref } from "@/lib/site";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/#eventos", label: "Descubre" },
  { href: "/#mapa", label: "Mapa" },
  { href: "/#como", label: "Cómo funciona" },
  { href: "/#descarga", label: "Organiza" },
] as const;

function SiteHeader() {
  const appHref = appWebHref("/");
  const ctaLabel = appHref ? "Entrar a la app" : "Descargar";
  const ctaShort = appHref ? "Entrar" : "App";

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-ds-12 pt-ds-12 sm:px-ds-16 md:px-ds-24">
      <nav
        aria-label="Principal"
        className="pointer-events-auto mx-auto flex max-w-page items-center gap-ds-4 rounded-full border border-border bg-glass px-ds-8 py-ds-8 shadow-glass backdrop-blur-xl sm:gap-ds-8 sm:px-ds-12 md:px-ds-16"
      >
        <Link
          href="/"
          className="mr-auto flex min-w-0 items-center gap-ds-8 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-aurora"
        >
          <BrandMark className="size-8 shrink-0 rounded-full" />
          <span className="truncate font-favorit text-body-sm font-bold text-foreground">
            Parche
          </span>
        </Link>

        <ul className="hidden items-center gap-ds-4 lg:flex">
          {NAV_LINKS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "inline-flex rounded-buttons px-ds-12 py-ds-4 font-favorit text-body-sm text-muted-foreground outline-none",
                  "hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-aurora",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <details className="relative lg:hidden">
          <summary
            className={cn(
              "cursor-pointer list-none rounded-buttons px-ds-8 py-ds-8 font-favorit text-caption font-bold tracking-favorit text-foreground uppercase outline-none marker:content-none",
              "hover:bg-muted focus-visible:ring-2 focus-visible:ring-aurora sm:px-ds-12",
              "[&::-webkit-details-marker]:hidden",
            )}
          >
            Menú
          </summary>
          <div className="absolute top-[calc(100%+8px)] right-0 flex min-w-52 flex-col gap-ds-4 rounded-cards border border-border bg-popover p-ds-12 shadow-card">
            <ul className="flex flex-col gap-ds-4">
              {NAV_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-buttons px-ds-12 py-ds-8 font-favorit text-body-sm text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-aurora"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-ds-4 flex items-center justify-between gap-ds-8 border-t border-border pt-ds-12 sm:hidden">
              <Link
                href="#buscar"
                className="inline-flex items-center gap-ds-8 rounded-buttons px-ds-12 py-ds-8 font-favorit text-body-sm text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-aurora"
              >
                <Icon as={Search} size={16} className="text-current" />
                Buscar
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </details>

        <Link
          href="#buscar"
          aria-label="Buscar eventos"
          className="hidden size-10 items-center justify-center rounded-full text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-aurora sm:inline-flex"
        >
          <Icon as={Search} size={16} className="text-current" />
        </Link>
        <ThemeToggle className="hidden sm:inline-flex" />
        <Button href={appHref ?? "/#descarga"} size="sm" className="shrink-0 px-ds-12 sm:px-4">
          <span className="sm:hidden">{ctaShort}</span>
          <span className="hidden sm:inline">{ctaLabel}</span>
        </Button>
      </nav>
    </header>
  );
}

function SkipLink() {
  return (
    <a
      href="#contenido"
      className="sr-only focus:not-sr-only focus:absolute focus:top-ds-16 focus:left-ds-16 focus:z-100 focus:rounded-buttons focus:bg-primary focus:px-ds-16 focus:py-ds-8 focus:font-favorit focus:text-caption focus:font-bold focus:tracking-favorit focus:text-primary-foreground focus:uppercase"
    >
      Saltar al contenido
    </a>
  );
}

export { SiteHeader, SkipLink };
