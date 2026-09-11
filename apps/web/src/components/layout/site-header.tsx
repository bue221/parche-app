import Link from "next/link";

import { BrandMark } from "@/components/brand/mark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/#eventos", label: "Eventos" },
  { href: "/#como", label: "Cómo" },
  { href: "/#ticket", label: "Ticket" },
  { href: "/#faq", label: "FAQ" },
] as const;

function SiteHeader() {
  return (
    <header className="pointer-events-none sticky top-0 z-50 p-ds-16">
      <nav
        aria-label="Principal"
        className="pointer-events-auto mx-auto flex max-w-page items-center gap-ds-8 rounded-navelements bg-muted px-ds-16 py-ds-8 md:px-ds-32"
      >
        <Link
          href="/"
          className="mr-auto flex items-center gap-ds-8 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        >
          <BrandMark className="size-8" />
          <span className="font-favorit text-body-sm font-bold tracking-favorit">
            Parche
          </span>
        </Link>

        <ul className="hidden items-center gap-ds-4 md:flex">
          {NAV_LINKS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "inline-flex rounded-buttons px-ds-16 py-ds-4 font-favorit text-body-sm tracking-favorit text-muted-foreground outline-none",
                  "hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <details className="relative md:hidden">
          <summary className="cursor-pointer list-none rounded-buttons px-ds-12 py-ds-8 font-favorit text-caption font-bold tracking-favorit uppercase outline-none marker:content-none hover:bg-background focus-visible:ring-2 focus-visible:ring-foreground [&::-webkit-details-marker]:hidden">
            Menú
          </summary>
          <ul className="absolute top-[calc(100%+8px)] right-0 flex min-w-40 flex-col gap-ds-4 rounded-cards bg-muted p-ds-12">
            {NAV_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-buttons px-ds-12 py-ds-8 font-favorit text-body-sm tracking-favorit hover:bg-background focus-visible:ring-2 focus-visible:ring-foreground"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </details>

        <ThemeToggle />

        <Button href={siteConfig.appWebUrl ?? "/#descarga"} size="sm">
          {siteConfig.appWebUrl ? "Abrir app" : "Descargar"}
        </Button>
      </nav>
    </header>
  );
}

function SkipLink() {
  return (
    <a
      href="#contenido"
      className="sr-only focus:not-sr-only focus:absolute focus:top-ds-16 focus:left-ds-16 focus:z-[100] focus:rounded-buttons focus:bg-primary focus:px-ds-16 focus:py-ds-8 focus:font-favorit focus:text-caption focus:font-bold focus:tracking-favorit focus:text-primary-foreground focus:uppercase"
    >
      Saltar al contenido
    </a>
  );
}

export { SiteHeader, SkipLink };
