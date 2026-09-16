import { Reveal } from "@/components/motion/reveal";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
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
        <SectionHeading
          id="como-heading"
          title="De la app a la noche"
          description="Tres pasos. Sin ruido. El plan queda listo."
        />
        <ol className="grid gap-ds-16 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal as="li" key={step.n} delayMs={index * 90}>
              <div className="flex h-full flex-col gap-ds-12 rounded-cards border border-border bg-surface p-ds-24 shadow-card">
                <span className="flex size-10 items-center justify-center rounded-full bg-aurora text-caption font-bold tracking-favorit text-pitch-black">
                  {step.n}
                </span>
                <Text as="h3" variant="headingSm">
                  {step.title}
                </Text>
                <Text variant="muted">{step.body}</Text>
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>
    </Section>
  );
}

export { HowItWorks };
