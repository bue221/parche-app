import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { legalMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = legalMetadata({
  path: "/legal/privacidad",
  title: "Política de privacidad",
  description: `Cómo ${siteConfig.name} trata datos personales en la web y en la app.`,
});

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad">
      <section className="flex flex-col gap-ds-12">
        <h2>1. Quiénes somos</h2>
        <p>
          {siteConfig.name} ({siteConfig.url}) opera una plataforma para
          descubrir eventos y comprar boletas. Esta política aplica a la web
          pública y a la app móvil.
        </p>
      </section>
      <section className="flex flex-col gap-ds-12">
        <h2>2. Datos que tratamos</h2>
        <ul>
          <li>Cuenta: correo, nombre y datos de perfil que nos entregues.</li>
          <li>Uso: eventos vistos, compras y preferencias de la app.</li>
          <li>Técnicos: logs, IP y cookies necesarias para operar el sitio.</li>
        </ul>
      </section>
      <section className="flex flex-col gap-ds-12">
        <h2>3. Para qué los usamos</h2>
        <p>
          Prestar el servicio (agenda, compra, QR), mejorar el producto, prevenir
          fraude y cumplir obligaciones legales. No vendemos tus datos.
        </p>
      </section>
      <section className="flex flex-col gap-ds-12">
        <h2>4. Conservación y derechos</h2>
        <p>
          Conservamos la información mientras tengas cuenta o haya una obligación
          legal. Puedes pedir acceso, corrección o eliminación en{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
        </p>
      </section>
      <section className="flex flex-col gap-ds-12">
        <h2>5. Cambios</h2>
        <p>
          Si actualizamos esta política, publicaremos la fecha aquí. El uso
          continuo del servicio implica que aceptas la versión vigente.
        </p>
      </section>
    </LegalPage>
  );
}
