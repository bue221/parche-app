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
            Esta página no existe. Vuelve al parche y arma la noche.
          </Text>
          <Button href="/">Ir al inicio</Button>
        </Stack>
      </Container>
    </main>
  );
}
