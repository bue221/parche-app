import { Button } from "@/components/ui/button";
import { Container, Section, Stack } from "@/components/ui/layout";
import { Text } from "@/components/ui/text";
import { siteConfig } from "@/lib/site";

function DownloadCta() {
  const appStore = siteConfig.appStoreUrl;
  const playStore = siteConfig.playStoreUrl;
  const appWeb = siteConfig.appWebUrl;

  return (
    <Section id="descarga" aria-labelledby="descarga-heading">
      <Container>
        <Stack className="items-start gap-ds-16 rounded-cards bg-muted p-ds-32 md:p-ds-60">
          <Text as="h2" id="descarga-heading" variant="heading">
            Lleva la noche en el bolsillo
          </Text>
          <Text variant="lead" className="max-w-lg">
            iOS y Android. Descubre qué hay hoy y confirma que vas.
          </Text>
          <div className="mt-ds-8 flex flex-wrap gap-ds-12">
            {appWeb ? (
              <Button href={appWeb}>Abrir en el navegador</Button>
            ) : null}
            <Button href={appStore || "#descarga"} variant={appWeb ? "outline" : "default"}>
              App Store
            </Button>
            <Button href={playStore || "#descarga"} variant="outline">
              Google Play
            </Button>
          </div>
          {!appStore && !playStore ? (
            <Text variant="helper">
              {appWeb
                ? "La app web ya está disponible. iOS y Android, próximamente."
                : "Próximamente en iOS y Android."}
            </Text>
          ) : null}
        </Stack>
      </Container>
    </Section>
  );
}

export { DownloadCta };
