import { Button } from "@/components/ui/button";
import { Container, Stack } from "@/components/ui/layout";
import { Text } from "@/components/ui/text";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center py-ds-80">
      <Container>
        <Stack className="items-start gap-ds-16">
          <Text as="h1" variant="display">
            404
          </Text>
          <Text variant="lead" className="max-w-md">
            Esta página no existe o ya no está publicada. Sigue explorando la
            agenda o vuelve al inicio.
          </Text>
          <div className="flex flex-wrap gap-ds-12">
            <Button href="/explorar">Explorar eventos</Button>
            <Button href="/" variant="outline">
              Ir al inicio
            </Button>
          </div>
          <p className="text-body-sm text-muted-foreground">
            ¿Buscabas un artista? Prueba desde el lineup de un evento o el
            explorar.
          </p>
        </Stack>
      </Container>
    </main>
  );
}
