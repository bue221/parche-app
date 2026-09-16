"use client";

import { Button } from "@/components/ui/button";
import { Container, Stack } from "@/components/ui/layout";
import { Text } from "@/components/ui/text";

export default function EventError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="contenido" className="flex flex-1 items-center py-ds-80">
      <Container>
        <Stack className="items-start gap-ds-16">
          <Text as="h1" variant="heading">
            No pudimos cargar esta fecha
          </Text>
          <Text variant="lead" className="max-w-md">
            Parche no respondió a tiempo. Reintenta o vuelve a la cartelera.
          </Text>
          <div className="flex flex-wrap gap-ds-12">
            <Button onClick={reset}>Reintentar</Button>
            <Button href="/#eventos" variant="outline">
              Ver eventos
            </Button>
          </div>
        </Stack>
      </Container>
    </main>
  );
}
