import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Container, Section, Stack } from "@/components/ui/layout";
import { Tag } from "@/components/ui/tag";
import { Text } from "@/components/ui/text";
import { ArrowUpRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Sistema visual",
  description:
    "Catálogo interno de tokens y primitivos Parche. No forma parte del índice público.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/sistema" },
};

const PRIMITIVES = [
  { name: "pitch-black", className: "bg-pitch-black" },
  { name: "paper-white", className: "bg-paper-white border border-border" },
  { name: "ash-gray", className: "bg-ash-gray" },
  { name: "concrete", className: "bg-concrete" },
  { name: "charcoal", className: "bg-charcoal" },
  { name: "slate", className: "bg-slate" },
  { name: "stone", className: "bg-stone" },
  { name: "confirm", className: "bg-confirm" },
] as const;

const SEMANTIC = [
  { name: "background", className: "bg-background border border-border" },
  { name: "foreground", className: "bg-foreground" },
  { name: "primary", className: "bg-primary" },
  { name: "muted", className: "bg-muted" },
  { name: "border", className: "bg-border" },
] as const;

const TYPE = [
  { variant: "display" as const, sample: "Display / Foggy" },
  { variant: "heading" as const, sample: "Heading 28" },
  { variant: "headingSm" as const, sample: "Heading SM 24" },
  { variant: "subheading" as const, sample: "Subheading 18" },
  { variant: "default" as const, sample: "Body 16 — tracking Favorit" },
  { variant: "muted" as const, sample: "Muted copy" },
  { variant: "caption" as const, sample: "Caption 12" },
];

export default function DesignSystemPage() {
  return (
    <main id="contenido" className="flex-1">
      <Section aria-labelledby="ds-heading">
        <Container>
          <Stack className="gap-ds-12">
            <Tag>Interno · noindex</Tag>
            <Text as="h1" id="ds-heading" variant="heading">
              Sistema visual
            </Text>
            <Text variant="lead" className="max-w-xl">
              Mismos tokens que app-frontend. Chrome en semántica. Color solo
              en artwork y en confirm.
            </Text>
          </Stack>
        </Container>
      </Section>

      <Section aria-labelledby="ds-color-heading" className="pt-0">
        <Container>
          <Text as="h2" id="ds-color-heading" variant="headingSm" className="mb-ds-24">
            Primitivos
          </Text>
          <ul className="grid grid-cols-2 gap-ds-16 md:grid-cols-4">
            {PRIMITIVES.map((swatch) => (
              <li key={swatch.name} className="flex flex-col gap-ds-8">
                <div className={`h-20 rounded-cards ${swatch.className}`} />
                <Text variant="caption">{swatch.name}</Text>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section aria-labelledby="ds-semantic-heading" className="pt-0">
        <Container>
          <Text as="h2" id="ds-semantic-heading" variant="headingSm" className="mb-ds-24">
            Semánticos
          </Text>
          <ul className="grid grid-cols-2 gap-ds-16 md:grid-cols-5">
            {SEMANTIC.map((swatch) => (
              <li key={swatch.name} className="flex flex-col gap-ds-8">
                <div className={`h-20 rounded-cards ${swatch.className}`} />
                <Text variant="caption">{swatch.name}</Text>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section aria-labelledby="ds-type-heading" className="pt-0">
        <Container>
          <Text as="h2" id="ds-type-heading" variant="headingSm" className="mb-ds-24">
            Tipo
          </Text>
          <Stack className="gap-ds-16">
            {TYPE.map((row) => (
              <Text key={row.variant} as="p" variant={row.variant}>
                {row.sample}
              </Text>
            ))}
          </Stack>
        </Container>
      </Section>

      <Section aria-labelledby="ds-components-heading" className="pt-0">
        <Container>
          <Text as="h2" id="ds-components-heading" variant="headingSm" className="mb-ds-24">
            Componentes
          </Text>
          <div className="flex flex-wrap items-center gap-ds-12">
            <Button>Filled pill</Button>
            <Button variant="outline">Outlined pill</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">
              Link
              <Icon as={ArrowUpRight} />
            </Button>
            <Tag>Tag</Tag>
          </div>
        </Container>
      </Section>

      <Section band="ink" aria-labelledby="ds-band-heading">
        <Container>
          <Text
            as="h2"
            id="ds-band-heading"
            variant="display"
            className="text-background uppercase"
          >
            Dark band
          </Text>
          <p className="mt-ds-16 max-w-md font-favorit text-subheading tracking-favorit text-current/80">
            Banda invertida: tinta en claro, papel en oscuro. El contraste lo
            pone el tipo.
          </p>
        </Container>
      </Section>
    </main>
  );
}
