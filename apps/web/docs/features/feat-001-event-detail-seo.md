# FEAT-001: Detalle de evento (SEO / ISR)

Páginas públicas de evento en Next.js: HTML prerenderizado, metadata por fecha y CTA a la app. Esta web no vende ni opera puerta.

| Campo | Valor |
|-------|-------|
| Superficie | `web-frontend` |
| Ruta | `/eventos/{id}` (UUID) |
| Render | ISR (`revalidate` 120s, `dynamicParams`) |
| Contrato | `GET /v1/events`, `GET /v1/events/{id}` |

## Quick path

1. Build lista publicados y prerenderiza `/eventos/{id}`.
2. Crawler recibe HTML + JSON-LD `Event` + OG.
3. Usuario abre “Abrir en la app” → Expo web `/event/{id}`.

## Details

| Topic | Decision |
|-------|----------|
| SSG puro | No. El catálogo cambia; ISR + params on-demand. |
| Slug | Fuera de alcance. El API de detalle es UUID. |
| Indexación | Solo `published`. `cancelled` se ve y va `noindex`. Draft → 404. |
| Compra | No. Sticky CTA a `NEXT_PUBLIC_APP_WEB_URL`. |
| Mapa | Botón “Abrir en Google Maps” con `lat,lng` del evento. Sin pin no se muestra. |
| Landing | Featured enlaza a estas rutas. CTA “Entrar a la app” va a la raíz de Expo. |

## Checklist

- [ ] `/eventos/{id}` de un publicado tiene title, canonical y JSON-LD.
- [ ] Sitemap incluye landing + publicados.
- [ ] API caído en build: `generateStaticParams` vacío, el build no falla.
- [ ] CTA de detalle abre `/event/{id}` en la app web; el de landing abre `/`.

## Next step

Pretty URLs por slug (hace falta lookup global o `{tenant}/{slug}` en el backend). Blog editorial: [F23](../../../backend/docs/features/F23-editorial-posts.md), no en la app.
