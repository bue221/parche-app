import { FAQS } from "@/constants/faqs";
import { Container, Section, SectionHeading } from "@/components/ui/layout";

function Faq() {
  return (
    <Section id="faq" aria-labelledby="faq-heading">
      <Container>
        <SectionHeading
          id="faq-heading"
          title="Preguntas"
          description="Lo esencial antes de armar el plan."
        />
        <div className="flex flex-col gap-ds-12">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="group rounded-cards border border-border bg-surface p-ds-24 shadow-card"
            >
              <summary className="cursor-pointer list-none font-favorit text-subheading font-bold tracking-tight outline-none marker:content-none focus-visible:ring-2 focus-visible:ring-aurora [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-ds-16">
                  {item.q}
                  <span
                    aria-hidden
                    className="text-caption font-bold text-aurora transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-ds-12 max-w-2xl font-favorit text-body text-muted-foreground">
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
