import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { legalMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = legalMetadata({
  path: "/legal/terminos",
  title: "Términos de uso",
  description: `Condiciones para usar la web y la app de ${siteConfig.name}.`,
});

export default function TerminosPage() {
  return (
    <LegalPage title="Términos de uso">
      <section className="flex flex-col gap-ds-12">
        <h2>1. El servicio</h2>
        <p>
          {siteConfig.name} permite descubrir eventos publicados y, en la app,
          comprar boletas. La web pública es de lectura y SEO; la compra y el QR
          viven en la app.
        </p>
      </section>
      <section className="flex flex-col gap-ds-12">
        <h2>2. Cuentas</h2>
        <p>
          Eres responsable de la información que publicas y de proteger tu
          acceso. Podemos suspender cuentas que abusen del servicio o vulneren
          la ley.
        </p>
      </section>
      <section className="flex flex-col gap-ds-12">
        <h2>3. Eventos y boletas</h2>
        <p>
          Los organizers publican fechas bajo su responsabilidad. Las reglas de
          entrada, reembolsos y aforo las define cada evento; Parche facilita la
          plataforma.
        </p>
      </section>
      <section className="flex flex-col gap-ds-12">
        <h2>4. Contenido</h2>
        <p>
          No uses la plataforma para spam, engaño o material ilegal. Nos
          reservamos el derecho de retirar contenido que incumpla estas reglas.
        </p>
      </section>
      <section className="flex flex-col gap-ds-12">
        <h2>5. Contacto</h2>
        <p>
          Dudas sobre estos términos:{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
