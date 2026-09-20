import { Button } from "@/components/ui/button";
import { Container, Section, Stack } from "@/components/ui/layout";
import { Text } from "@/components/ui/text";
import { appWebHref, siteConfig } from "@/lib/site";

function DownloadCta() {
  const appStore = siteConfig.appStoreUrl;
  const playStore = siteConfig.playStoreUrl;
  const appWeb = appWebHref("/");

  return (
    <Section id="descarga" aria-labelledby="descarga-heading">
      <Container>
        <div className="grid overflow-hidden rounded-cards border border-border bg-surface shadow-card md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Stack className="items-start gap-ds-16 p-ds-24 sm:p-ds-32 md:p-ds-60">
            <span className="font-favorit text-caption font-bold tracking-favorit text-aurora uppercase">
              Esta noche
            </span>
            <Text
              as="h2"
              id="descarga-heading"
              variant="display"
              className="max-w-[14ch] text-[clamp(2.4rem,6vw,4rem)]"
            >
              Compra, guarda el QR, entra
            </Text>
            <Text variant="lead" className="max-w-lg">
              Elige la fecha, paga en un toque y llega con la boleta en el
              celular. Crear y operar tu propio parche también vive en la app.
            </Text>
          </Stack>
          <Stack className="items-start justify-center gap-ds-16 bg-aurora p-ds-24 text-pitch-black sm:p-ds-32 md:min-h-full md:p-ds-60">
            <Text variant="caption" className="text-pitch-black">
              {appWeb ? "Listo para comprar" : "Próximamente"}
            </Text>
            <Text as="p" variant="heading" className="text-pitch-black">
              Tu boleta, en el bolsillo
            </Text>
            <div className="mt-ds-8 flex flex-wrap gap-ds-12">
              {appWeb ? (
                <Button
                  href={appWeb}
                  className="bg-pitch-black text-paper-white hover:opacity-90"
                >
                  Comprar en la app
                </Button>
              ) : null}
              <Button
                href={appStore || "#descarga"}
                variant="outline"
                className="border-pitch-black text-pitch-black hover:bg-pitch-black/10"
              >
                App Store
              </Button>
              <Button
                href={playStore || "#descarga"}
                variant="outline"
                className="border-pitch-black text-pitch-black hover:bg-pitch-black/10"
              >
                Google Play
              </Button>
            </div>
            {!appStore && !playStore ? (
              <Text variant="helper" className="normal-case text-pitch-black/70">
                {appWeb
                  ? "La app web ya vende. iOS y Android, próximamente."
                  : "Próximamente en iOS y Android."}
              </Text>
            ) : null}
          </Stack>
        </div>
      </Container>
    </Section>
  );
}

export { DownloadCta };
