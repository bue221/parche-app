import { Reveal } from "@/components/motion/reveal";
import { Container, Section } from "@/components/ui/layout";
import { Text } from "@/components/ui/text";

function Manifesto() {
  return (
    <Section band="ink" aria-labelledby="manifiesto-heading">
      <Container>
        <Reveal>
          <Text
            as="h2"
            id="manifiesto-heading"
            variant="display"
            className="text-background uppercase"
          >
            La noche
            <br />
            en tu
            <br />
            ciudad
          </Text>
          <p className="mt-ds-24 max-w-md font-favorit text-subheading tracking-favorit text-current/80">
            Quién toca, a qué hora, en qué barrio. Parche junta lo que está
            pasando para que armes el plan y confirmes que vas.
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}

export { Manifesto };
