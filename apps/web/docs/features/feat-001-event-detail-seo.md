# FEAT-001: Detalle de evento (SEO / ISR)

Páginas públicas de evento en Next.js: HTML prerenderizado, metadata por fecha y CTA a la app. Esta web no cobra ni opera puerta.

| Campo | Valor |
|-------|-------|
| Superficie | `web-frontend` |
| Ruta | `/eventos/{slug\|uuid}` (canónico con slug cuando exista) |
| Render | ISR (`revalidate` 120s, `dynamicParams`) |
| Contrato | `GET /v1/events`, `GET /v1/events/{id}`, `GET /v1/events/{id}/ticket-types` |

## Quick path

1. Build lista publicados y prerenderiza `/eventos/{slug}` (fallback UUID).
2. Crawler recibe HTML + JSON-LD `Event` (con `AggregateOffer` si hay etapas) + OG.
3. Usuario ve fecha, lugar, etapas y precio; abre **Comprar boletas** → Expo web `/event/{id}`.
4. Si alguien abre el UUID y hay slug, `permanentRedirect` al path canónico.

## Details

| Topic | Decision |
|-------|----------|
| SSG puro | No. El catálogo cambia; ISR + params on-demand. |
| Slug | Canónico vía `eventPath(event)`. Lookup: UUID directo; slug = scan de publicados + `getEvent(id)`. `normalizeEventParam` decodifica `%XX` y NFC (acentos). |
| Indexación | Solo `published`. `cancelled` se ve y va `noindex`. Draft → 404. |
| Compra | Esta web no cobra. Muestra etapas públicas y un sticky **Comprar boletas** a `NEXT_PUBLIC_APP_WEB_URL/event/{id}`. |
| Mapa | Botón **Cómo llegar** con `lat,lng` del evento. Sin pin no se muestra. |
| Landing | El destacado enlaza a estas rutas. El CTA de compra del spotlight abre la ficha en Expo. |
| OG / Twitter | `opengraph-image.tsx` y `twitter-image.tsx` (1200×630). Resuelven slug o UUID. El flyer 4:5 va en JSON-LD, no como `og:image`. |
| Similares | Máx. 4 cards `listing` en 2/4 columnas. No posters 4:5. |

## Checklist

- [ ] `/eventos/{slug}` de un publicado tiene title, canonical, JSON-LD y OG 1200×630.
- [ ] UUID con slug redirige 308 al slug.
- [ ] Sitemap incluye landing + publicados (URL con slug).
- [ ] API caído en build: `generateStaticParams` vacío, el build no falla.
- [ ] CTA de detalle abre `/event/{id}` en la app web; el de landing abre `/`.
- [ ] Si hay etapas a la venta, la ficha muestra precio “Desde” y el sticky dice Comprar boletas.

## Next step

Blog editorial: [F23](../../../backend/docs/features/F23-editorial-posts.md), no en la app. Artistas: [feat-003-artists-legal.md](feat-003-artists-legal.md).
