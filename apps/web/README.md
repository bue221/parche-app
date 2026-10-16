# Parche web

Sitio público de Parche en [Next.js 16](https://nextjs.org/docs). Landing de eventos en vivo + el mismo sistema visual que `app-frontend`: flyer blanco y negro, claro/oscuro del sistema, verde solo en confirmación.

Repo: [github.com/bue221/web-parche-app](https://github.com/bue221/web-parche-app). Wiki: [github.com/bue221/parche-web-wiki](https://github.com/bue221/parche-web-wiki).

## Quick path

1. `pnpm install` (solo pnpm; npm/yarn/bun están bloqueados)
2. `pnpm dev`
3. Abre [http://localhost:3000](http://localhost:3000)

Tokens y reglas visuales: [`docs/ui/design.md`](docs/ui/design.md). Catálogo interno (noindex): `/sistema`.

## Stack

| Pieza | Dónde |
|-------|--------|
| Landing | `src/app/page.tsx` + `src/components/landing/` |
| Explorar | `src/app/explorar/` + `src/components/explore/` |
| Eventos ISR | `src/app/eventos/[id]/page.tsx` + `src/lib/events.ts` |
| Artistas ISR | `src/app/artistas/[id]/page.tsx` + `src/lib/artists.ts` |
| Legal | `src/app/legal/` |
| Tokens | `src/app/globals.css` |
| Primitivos | `src/components/ui/` |
| SEO | `src/lib/seo.ts`, `sitemap.ts`, `robots.ts`, JSON-LD, OG image |
| Fuentes | Inter (Favorit) y Antonio (Foggy) vía `next/font/local` |

## SEO

- `metadataBase`, title template, Open Graph, Twitter, canonical y `es-CO`
- `sitemap.ts` / `robots.ts` / `manifest.ts`
- JSON-LD: Organization, WebSite, WebPage, SoftwareApplication, FAQPage, **Event**, **ItemList**, **Person**
- Imagen OG generada con Antonio (flyer)
- `/sistema` queda fuera del índice
- Eventos publicados se prerenderizan (ISR 120s); cancelados se ven y no se indexan
- `/explorar` y hubs ciudad/género; `noindex` si hay `q` libre
- `/artistas/{id}` desde lineups; legal en `/legal/*`

## Env

Copia [`.env.example`](.env.example) a `.env`.

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_SITE_URL` | Canonical, sitemap y JSON-LD de este sitio |
| `API_URL` | Backend para ISR (`GET /v1/events`) |
| `MEDIA_HOSTS` | Hosts de flyers para `next/image` (p. ej. `localhost:9000`) |
| `NEXT_PUBLIC_APP_WEB_URL` | App Expo en web (`app-frontend`, `pnpm web`) |
| `NEXT_PUBLIC_APP_STORE_URL` | App Store (vacío = no se muestra el CTA) |
| `NEXT_PUBLIC_PLAY_STORE_URL` | Google Play (vacío = no se muestra el CTA) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Contacto en páginas legales |
