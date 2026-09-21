# Build y release

Cómo se convierte este repo en un binario de tienda. Cubre identificadores, variables de entorno, perfiles de EAS y los universal links, que necesitan archivos fuera de este repo para funcionar.

## Configuración: app.json + app.config.ts

`app.json` guarda lo estático (nombre, iconos, splash, plugins). [`app.config.ts`](../../app.config.ts) añade encima lo que depende del entorno:

| Qué | Cuándo se aplica |
|-----|------------------|
| `ios.bundleIdentifier` / `android.package` = `app.parche.mobile` | Siempre |
| `NSAllowsLocalNetworking` y `usesCleartextTraffic` | Solo si `APP_ENV` (o `EAS_BUILD_PROFILE`) **no** es `production` |
| `ios.associatedDomains` / `android.intentFilters` | Solo si `EXPO_PUBLIC_WEB_URL` está definido |

El tráfico en claro es una escotilla de desarrollo para alcanzar la API en la LAN. Un build de tienda no lo lleva: Apple lo rechaza y en Android abre la puerta a cualquier origen sin TLS. Si necesitas verificar que quedó fuera:

```sh
APP_ENV=production npx expo config --type public
```

## Variables de entorno

| Variable | Para qué | Si falta |
|----------|----------|----------|
| `EXPO_PUBLIC_API_URL` | Base de la API REST | Cae a `http://localhost:8080` |
| `EXPO_PUBLIC_WEB_URL` | Origen https del sitio público; habilita universal links y el link de Compartir | Compartir entrega `parche://…` y la app no reclama links https |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Login con Google ([FEAT-039](../features/feat-039-auth-google.md)) | El botón de Google no aparece |
| `APP_ENV` | Marca el build como `production` | Se usa `EAS_BUILD_PROFILE` |

`EXPO_PUBLIC_WEB_URL` debe ser un origen `https`. Cualquier otra cosa hace fallar la lectura de config con un mensaje explícito, en vez de producir en silencio un build sin deep links.

## Perfiles de EAS

[`eas.json`](../../eas.json) define tres perfiles sobre una base común:

| Perfil | Para qué | Notas |
|--------|----------|-------|
| `development` | Dev client en dispositivo | Apunta a `localhost:8080`, distribución interna |
| `preview` | APK interno para QA | Mismo API que producción, sin firmar para tienda |
| `production` | AAB / IPA de tienda | `autoIncrement`, sin cleartext |

### Primer build

1. `pnpm add -D eas-cli` (o `npx eas-cli@latest`).
2. `npx eas init` — escribe `extra.eas.projectId` en la config. **Todavía no está**; sin ese paso `eas build` no arranca.
3. `npx eas credentials` para generar keystore y perfiles de aprovisionamiento.
4. `npx eas build --profile preview --platform android` para validar el pipeline antes de tocar producción.

## Universal links

La config nativa ya reclama estas rutas cuando hay dominio, alineadas con [FEAT-035](../features/feat-035-deep-links.md):

`/event` · `/artist` · `/invites` · `/orders` · `/reset`

El QR del tiquete **no** es un link http y no aparece aquí.

Reclamar la ruta no basta: el sistema operativo solo entrega el link si el dominio confirma la asociación. Faltan dos archivos en el sitio web, servidos por https y con `Content-Type: application/json`:

| Plataforma | Archivo | Contenido clave |
|------------|---------|-----------------|
| iOS | `/.well-known/apple-app-site-association` | `appID` = `<TEAM_ID>.app.parche.mobile` y los paths de arriba |
| Android | `/.well-known/assetlinks.json` | `package_name` = `app.parche.mobile` y el `sha256_cert_fingerprints` del keystore |

El fingerprint sale de `npx eas credentials -p android` (campo *SHA256 Fingerprint*) o de Play Console en *Release → Setup → App Signing*. Mientras esos archivos no existan, Android manda el link al navegador sin avisar y iOS ignora el `associatedDomains`.

Para probar sin publicar el sitio, `npx expo start --tunnel` con `EXPO_TUNNEL_SUBDOMAIN` fijo sirve un host https estable que puedes poner en `EXPO_PUBLIC_WEB_URL`.

## Lo que todavía bloquea una publicación

- No hay `extra.eas.projectId`: `eas build` no corre hasta ejecutar `eas init`.
- No hay `apple-app-site-association` ni `assetlinks.json` publicados.
- El cobro usa Mercado Pago Checkout Pro cuando el API tiene `PAYMENT_PROVIDER=mercadopago` ([FEAT-021](../features/feat-021-ticket-purchase.md)). La UI demo (`/v1/dev/pay/`) solo aparece si el API sigue en `fake`.

## Relacionadas

[Tests](testing.md), [FEAT-035](../features/feat-035-deep-links.md), [FEAT-036](../features/feat-036-device-permissions.md)
