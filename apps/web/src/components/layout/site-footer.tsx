import Link from "next/link";

import { BrandMark } from "@/components/brand/mark";
import { Container } from "@/components/ui/layout";
import { Text } from "@/components/ui/text";
import { siteConfig } from "@/lib/site";

const FOOTER_LINKS = [
  { href: "/#eventos", label: "Eventos" },
  { href: "/#como", label: "Cómo funciona" },
  { href: "/#ticket", label: "Ticket" },
  { href: "/#faq", label: "Preguntas" },
  { href: "/sistema", label: "Sistema visual" },
] as const;

function SiteFooter() {
  return (
    <footer className="border-t border-border py-ds-48">
      <Container className="flex flex-col gap-ds-32 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-ds-12">
          <Link
            href="/"
            className="flex w-fit items-center gap-ds-8 outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            <BrandMark className="size-8" />
            <span className="font-favorit text-body-sm font-bold tracking-favorit">
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
                className="font-favorit text-caption font-bold tracking-favorit text-muted-foreground uppercase outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground"
              >
                {item.label}
              </Link>
            </li>
          ))}
          {siteConfig.appWebUrl ? (
            <li>
              <a
                href={siteConfig.appWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-favorit text-caption font-bold tracking-favorit text-muted-foreground uppercase outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground"
              >
                App web
              </a>
            </li>
          ) : null}
        </ul>
      </Container>
      <Container className="mt-ds-32">
        <Text variant="helper">
          © {new Date().getFullYear()} {siteConfig.name}. Descubre la noche.
          Confirma que vas.
        </Text>
      </Container>
    </footer>
  );
}

export { SiteFooter };
