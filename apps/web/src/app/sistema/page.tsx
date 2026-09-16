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
  { name: "surface", className: "bg-surface border border-border" },
  { name: "aurora", className: "bg-aurora" },
  { name: "neon", className: "bg-neon" },
  { name: "volt / confirm", className: "bg-confirm" },
  { name: "amber", className: "bg-amber" },
  { name: "danger", className: "bg-danger" },
] as const;

const SEMANTIC = [
  { name: "background", className: "bg-background border border-border" },
  { name: "foreground", className: "bg-foreground" },
  { name: "primary", className: "bg-primary" },
  { name: "muted", className: "bg-muted" },
  { name: "aurora-soft", className: "bg-aurora-soft" },
  { name: "border", className: "bg-border" },
  { name: "glass", className: "bg-glass border border-border" },
] as const;

const TYPE = [
  { variant: "display" as const, sample: "Qué hay hoy en tu ciudad?" },
  { variant: "heading" as const, sample: "Eventos destacados" },
  { variant: "headingSm" as const, sample: "Heading SM 22" },
  { variant: "subheading" as const, sample: "Subheading 18" },
  { variant: "default" as const, sample: "Body 16 — Inter, tracking normal" },
  { variant: "muted" as const, sample: "Muted copy" },
  { variant: "caption" as const, sample: "Caption 12" },
];

export default function DesignSystemPage() {
  return (
    <main id="contenido" className="flex-1">
      <Section aria-labelledby="ds-heading">
        <Container>
          <Stack className="gap-ds-12">
            <Tag tone="aurora">Interno · noindex</Tag>
            <Text as="h1" id="ds-heading" variant="heading">
              Sistema visual
            </Text>
            <Text variant="lead" className="max-w-xl">
              Canvas cinematográfico: foto primero, chrome de vidrio encima.
              Aurora marca la palabra clave. El CTA primario es inverso — blanco
              en oscuro, negro en claro.
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
                <div className={`h-20 rounded-cards ring-1 ring-border ${swatch.className}`} />
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
          <ul className="grid grid-cols-2 gap-ds-16 md:grid-cols-4 lg:grid-cols-7">
            {SEMANTIC.map((swatch) => (
              <li key={swatch.name} className="flex flex-col gap-ds-8">
                <div className={`h-20 rounded-cards ring-1 ring-border ${swatch.className}`} />
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
            <Button>Filled inverse</Button>
            <Button variant="outline">Outlined</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="signal">Aurora</Button>
            <Button variant="glass">Glass</Button>
            <Button variant="link">
              Link
              <Icon as={ArrowUpRight} />
            </Button>
            <Tag>Tag ink</Tag>
            <Tag tone="aurora">Hoy</Tag>
            <Tag tone="glass">Festival</Tag>
            <Tag tone="confirm">PASA</Tag>
            <Tag tone="amber">Pendiente</Tag>
            <Tag tone="danger">Inválido</Tag>
          </div>
        </Container>
      </Section>

      <Section band="ink" aria-labelledby="ds-band-heading">
        <Container>
          <span className="mb-ds-16 block h-2 w-ds-48 rounded-full bg-aurora" />
          <Text as="h2" id="ds-band-heading" variant="display">
            Banda inversa
          </Text>
          <p className="mt-ds-16 max-w-md font-favorit text-subheading text-current/80">
            Tinta en claro, papel en oscuro. Aurora es el acento, no el relleno.
          </p>
        </Container>
      </Section>
    </main>
  );
}
