import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { legalMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = legalMetadata({
  path: "/legal/cookies",
  title: "Cookies",
  description: `Cómo ${siteConfig.name} usa cookies y almacenamiento local en la web.`,
});

export default function CookiesPage() {
  return (
    <LegalPage title="Cookies">
      <section className="flex flex-col gap-ds-12">
        <h2>1. Qué usamos</h2>
        <p>
          En la web de {siteConfig.name} usamos almacenamiento local mínimo para
          preferencias de tema (claro/oscuro) y cookies técnicas necesarias para
          el sitio. No usamos cookies publicitarias de terceros en esta
          superficie.
        </p>
      </section>
      <section className="flex flex-col gap-ds-12">
        <h2>2. Para qué</h2>
        <ul>
          <li>Recordar tu preferencia de apariencia.</li>
          <li>Operar el sitio de forma segura y estable.</li>
        </ul>
      </section>
      <section className="flex flex-col gap-ds-12">
        <h2>3. Control</h2>
        <p>
          Puedes borrar datos del sitio desde la configuración del navegador. Si
          desactivas cookies esenciales, partes del sitio pueden dejar de
          funcionar.
        </p>
      </section>
      <section className="flex flex-col gap-ds-12">
        <h2>4. Más info</h2>
        <p>
          Ver también la{" "}
          <a href="/legal/privacidad">política de privacidad</a> o escribe a{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
