# Parche web

Sitio público de Parche en [Next.js 16](https://nextjs.org/docs). Landing de eventos en vivo + el mismo sistema visual que `app-frontend`: flyer blanco y negro, claro/oscuro del sistema, verde solo en confirmación.

Repo: [github.com/bue221/web-parche-app](https://github.com/bue221/web-parche-app). Wiki: [github.com/bue221/web-parche-app/wiki](https://github.com/bue221/web-parche-app/wiki).

## Quick path

1. `pnpm install` (solo pnpm; npm/yarn/bun están bloqueados)
2. `pnpm dev`
3. Abre [http://localhost:3000](http://localhost:3000)

Tokens y reglas visuales: [`docs/ui/design.md`](docs/ui/design.md). Catálogo interno (noindex): `/sistema`.

## Stack

| Pieza | Dónde |
|-------|--------|
| Landing | `src/app/page.tsx` + `src/components/landing/` |
| Eventos ISR | `src/app/eventos/[id]/page.tsx` + `src/lib/events.ts` |
| Tokens | `src/app/globals.css` |
| Primitivos | `src/components/ui/` |
| SEO | `src/lib/seo.ts`, `sitemap.ts`, `robots.ts`, JSON-LD, OG image |
| Fuentes | Inter (Favorit) y Antonio (Foggy) vía `next/font/local` |

## SEO

- `metadataBase`, title template, Open Graph, Twitter, canonical y `es-CO`
- `sitemap.ts` / `robots.ts` / `manifest.ts`
- JSON-LD: Organization, WebSite, WebPage, SoftwareApplication, FAQPage, **Event** en `/eventos/{id}`
- Imagen OG generada con Antonio (flyer)
- `/sistema` queda fuera del índice
- Eventos publicados se prerenderizan (ISR 120s); cancelados se ven y no se indexan

## Env

Copia [`.env.example`](.env.example) a `.env`.

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_SITE_URL` | Canonical, sitemap y JSON-LD de este sitio |
| `API_URL` | Backend para ISR (`GET /v1/events`) |
| `MEDIA_HOSTS` | Hosts de flyers para `next/image` (p. ej. `localhost:9000`) |
| `NEXT_PUBLIC_APP_WEB_URL` | App Expo en web (`app-frontend`, `pnpm web`) |
| `NEXT_PUBLIC_APP_STORE_URL` | Listado de App Store (vacío = próximamente) |
| `NEXT_PUBLIC_PLAY_STORE_URL` | Listado de Google Play (vacío = próximamente) |
