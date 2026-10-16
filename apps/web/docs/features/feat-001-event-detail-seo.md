# FEAT-001: Detalle de evento (SEO / ISR)

Páginas públicas de evento en Next.js: HTML prerenderizado, metadata por fecha y CTA a la app. Esta web no cobra ni opera puerta.

| Campo | Valor |
|-------|-------|
| Superficie | `web-frontend` |
| Ruta | `/eventos/{id}` (UUID) |
| Render | ISR (`revalidate` 120s, `dynamicParams`) |
| Contrato | `GET /v1/events`, `GET /v1/events/{id}`, `GET /v1/events/{id}/ticket-types` |

## Quick path

1. Build lista publicados y prerenderiza `/eventos/{id}`.
2. Crawler recibe HTML + JSON-LD `Event` (con `AggregateOffer` si hay etapas) + OG.
3. Usuario ve fecha, lugar, etapas y precio; abre **Comprar boletas** → Expo web `/event/{id}`.

## Details

| Topic | Decision |
|-------|----------|
| SSG puro | No. El catálogo cambia; ISR + params on-demand. |
| Slug | Fuera de alcance. El API de detalle es UUID. |
| Indexación | Solo `published`. `cancelled` se ve y va `noindex`. Draft → 404. |
| Compra | Esta web no cobra. Muestra etapas públicas y un sticky **Comprar boletas** a `NEXT_PUBLIC_APP_WEB_URL/event/{id}`. |
| Mapa | Botón **Cómo llegar** con `lat,lng` del evento. Sin pin no se muestra. |
| Landing | El destacado enlaza a estas rutas. El CTA de compra del spotlight abre la ficha en Expo. |

## Checklist

- [ ] `/eventos/{id}` de un publicado tiene title, canonical y JSON-LD.
- [ ] Sitemap incluye landing + publicados.
- [ ] API caído en build: `generateStaticParams` vacío, el build no falla.
- [ ] CTA de detalle abre `/event/{id}` en la app web; el de landing abre `/`.
- [ ] Si hay etapas a la venta, la ficha muestra precio “Desde” y el sticky dice Comprar boletas.

## Next step

Pretty URLs por slug (hace falta lookup global o `{tenant}/{slug}` en el backend). Blog editorial: [F23](../../../backend/docs/features/F23-editorial-posts.md), no en la app.
