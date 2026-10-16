import Link from "next/link";

import { BrandMark } from "@/components/brand/mark";
import { Container } from "@/components/ui/layout";
import { Text } from "@/components/ui/text";
import { appWebHref, siteConfig } from "@/lib/site";

const FOOTER_LINKS = [
  { href: "/#eventos", label: "Eventos" },
  { href: "/#ciudades", label: "Ciudades" },
  { href: "/#como", label: "Cómo funciona" },
  { href: "/#faq", label: "Preguntas" },
  { href: "/sistema", label: "Sistema visual" },
] as const;

function SiteFooter() {
  const appHref = appWebHref("/");
  return (
    <footer className="border-t border-border bg-background py-ds-48">
      <Container className="flex flex-col gap-ds-32 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-ds-12">
          <Link
            href="/"
            className="flex w-fit items-center gap-ds-8 outline-none focus-visible:ring-2 focus-visible:ring-aurora"
          >
            <BrandMark className="size-8 rounded-full" />
            <span className="font-favorit text-body-sm font-bold text-foreground">
              Parche
            </span>
          </Link>
          <Text variant="muted" className="max-w-xs">
            {siteConfig.tagline}
          </Text>
        </div>

        <ul className="flex flex-wrap gap-ds-16">
          {FOOTER_LINKS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="font-favorit text-caption font-bold tracking-favorit text-muted-foreground uppercase outline-none hover:text-aurora focus-visible:ring-2 focus-visible:ring-aurora"
              >
                {item.label}
              </Link>
            </li>
          ))}
          {appHref ? (
            <li>
              <a
                href={appHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-favorit text-caption font-bold tracking-favorit text-muted-foreground uppercase outline-none hover:text-aurora focus-visible:ring-2 focus-visible:ring-aurora"
              >
                Entrar a la app
              </a>
            </li>
          ) : null}
        </ul>
      </Container>
      <Container className="mt-ds-32 flex flex-col gap-ds-8 md:flex-row md:items-center md:justify-between">
        <Text variant="helper">
          © {new Date().getFullYear()} {siteConfig.name}. Descubre la noche.
          Compra tu boleta.
        </Text>
        <Text variant="helper">
          Fotos de ciudades: Wikimedia Commons.
        </Text>
      </Container>
    </footer>
  );
}

export { SiteFooter };
