import type { ReactNode } from "react";

import { Container } from "@/components/ui/layout";
import { Text } from "@/components/ui/text";
import { siteConfig } from "@/lib/site";

function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main id="contenido" className="flex flex-1 flex-col py-ds-32 md:py-ds-48">
      <Container className="max-w-3xl">
        <p className="font-favorit text-caption font-bold tracking-favorit text-aurora uppercase">
          Legal
        </p>
        <Text as="h1" variant="heading" className="mt-ds-8">
          {title}
        </Text>
        <p className="mt-ds-8 text-body-sm text-muted-foreground">
          Última actualización: septiembre 2026 · {siteConfig.name}
        </p>
        <div className="prose-legal mt-ds-32 flex flex-col gap-ds-24 text-body-sm text-foreground [&_h2]:font-favorit [&_h2]:text-subheading [&_h2]:font-bold [&_h2]:tracking-tight [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-ds-20 [&_ul]:text-muted-foreground [&_a]:text-aurora [&_a]:underline">
          {children}
        </div>
        <p className="mt-ds-32 text-body-sm text-muted-foreground">
          Contacto:{" "}
          <a href={`mailto:${siteConfig.email}`} className="text-aurora underline">
            {siteConfig.email}
          </a>
        </p>
      </Container>
    </main>
  );
}

export { LegalPage };
