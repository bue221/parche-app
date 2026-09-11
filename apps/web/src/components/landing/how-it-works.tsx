import { Reveal } from "@/components/motion/reveal";
import { Container, Section, Stack } from "@/components/ui/layout";
import { Text } from "@/components/ui/text";

const STEPS = [
  {
    n: "01",
    title: "Abre Parche",
    body: "Mira qué hay hoy en tu ciudad: conciertos, rumba, teatro y festivales.",
  },
  {
    n: "02",
    title: "Escoge la noche",
    body: "Filtra por lugar, hora y género. Cada evento te dice quién toca y dónde queda.",
  },
  {
    n: "03",
    title: "Confirma que vas",
    body: "Un toque y el parche queda armado. Tus amigos ven que estás dentro.",
  },
] as const;

function HowItWorks() {
  return (
    <Section id="como" aria-labelledby="como-heading">
      <Container>
        <Reveal>
          <Text as="h2" id="como-heading" variant="heading" className="mb-ds-32">
            De la app a la noche
          </Text>
        </Reveal>
        <ol className="grid gap-ds-24 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step.n} delayMs={index * 90}>
              <Stack className="gap-ds-8 rounded-cards bg-muted p-ds-24 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-parche motion-safe:hover:-translate-y-1">
                <span className="font-favorit text-caption font-bold tracking-favorit text-muted-foreground uppercase">
                  {step.n}
                </span>
                <Text as="h3" variant="headingSm">
                  {step.title}
                </Text>
                <Text variant="muted">{step.body}</Text>
              </Stack>
            </Reveal>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

export { HowItWorks };
