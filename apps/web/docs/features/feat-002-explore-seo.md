# FEAT-002: Explorar (SEO / lista + mapa)

Agenda pública indexable en Next.js: lista foto-first, filtros en URL, mapa OSM y CTA a la app. Paridad de descubrimiento con Explorar de `app-frontend`, sin compra ni sesión.

| Campo | Valor |
|-------|-------|
| Superficie | `web-frontend` |
| Ruta | `/explorar`, `/explorar/{hub}` (ciudad o género) |
| Render | ISR (`revalidate` 120s) + `searchParams` |
| Contrato | `GET /v1/events` (`q`, `from`, `to`, `genre`, `artist_id`) |
| Estado cliente | Zustand (`explore-store`) sincronizado con la query |

## Quick path

1. Crawler abre `/explorar` → HTML con links a `/eventos/{slug}`, metadata e `ItemList` JSON-LD.
2. Hubs estáticos (`/explorar/bogota`, `/explorar/techno`) en sitemap con título propio.
3. Usuario filtra con chips/calendario → URL (`?genre=techno&from=…`) y la lista/mapa se actualizan.
4. Desktop (≥900px): lista primero; botón para mostrar mapa. Móvil: FAB Lista/Mapa.
5. “Abrir en la app” → `NEXT_PUBLIC_APP_WEB_URL` (stores solo si hay env).

## Details

| Topic | Decision |
|-------|----------|
| SEO | Indexar `/explorar` y hubs. `noindex` si hay `q` libre. |
| Sitemap | `/explorar` + hubs de `listExploreHubs()`. |
| Hubs | Género = chip conocido; ciudad = `LANDING_CITIES` + filtro por dirección. |
| Rails | Esta noche + rieles por género. Sin “Para ti” (sin sesión). |
| Mapa | Leaflet + teselas OSM HOT; pines pill con fecha. Sin Google/Mapbox. Sin zoom al hover. |
| Cards | `EventCard` compartido. Enlace vía `eventPath(event)` (slug). |
| Fuera de alcance | Bbox al pan, favoritos locales, AuthSheet, compra, infinite scroll. |

## Checklist

- [ ] `/explorar` tiene title, canonical, JSON-LD `CollectionPage` + `ItemList`.
- [ ] Hubs ciudad/género en sitemap y con metadata.
- [ ] Chips/calendario actualizan la query y el listado.
- [ ] Wide: lista + mapa opcional; compacto: FAB toggle.
- [ ] Landing/header apuntan a `/explorar` (no a Expo `/explore`).
- [ ] Doc indexada en `docs/README.md` y `AGENTS.md`.

## Relacionadas

[feat-001-event-detail-seo.md](feat-001-event-detail-seo.md), [feat-003-artists-legal.md](feat-003-artists-legal.md). App: FEAT-005 / FEAT-006 / FEAT-032 en `app-frontend`.
