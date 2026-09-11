import { FAQS } from "@/constants/faqs";
import { Container, Section } from "@/components/ui/layout";
import { Text } from "@/components/ui/text";

function Faq() {
  return (
    <Section id="faq" aria-labelledby="faq-heading">
      <Container>
        <Text as="h2" id="faq-heading" variant="heading" className="mb-ds-32">
          Preguntas
        </Text>
        <div className="flex flex-col gap-ds-16">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="group rounded-cards bg-muted p-ds-24 open:bg-muted"
            >
              <summary className="cursor-pointer list-none font-favorit text-subheading font-bold tracking-favorit outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-foreground [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-ds-16">
                  {item.q}
                  <span
                    aria-hidden
                    className="text-caption font-bold transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-ds-12 max-w-2xl font-favorit text-body tracking-favorit text-muted-foreground">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}

export { Faq };
