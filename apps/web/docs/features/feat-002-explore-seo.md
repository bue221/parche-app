# FEAT-002: Explorar (SEO / lista + mapa)

Agenda pública indexable en Next.js: lista foto-first, filtros en URL, mapa OSM y CTA a la app. Paridad de descubrimiento con Explorar de `app-frontend`, sin compra ni sesión.

| Campo | Valor |
|-------|-------|
| Superficie | `web-frontend` |
| Ruta | `/explorar` |
| Render | ISR (`revalidate` 120s) + `searchParams` |
| Contrato | `GET /v1/events` (`q`, `from`, `to`, `genre`, `artist_id`) |
| Estado cliente | Zustand (`explore-store`) sincronizado con la query |

## Quick path

1. Crawler abre `/explorar` → HTML con links a `/eventos/{id}`, metadata e `ItemList` JSON-LD.
2. Usuario filtra con chips → URL (`?genre=techno&from=…`) y la lista/mapa se actualizan.
3. Desktop (≥900px): split lista + mapa. Móvil: FAB Lista/Mapa.
4. “Abrir en la app” → `NEXT_PUBLIC_APP_WEB_URL`.

## Details

| Topic | Decision |
|-------|----------|
| SEO | Indexar `/explorar` y filtros estables (género/fecha). `noindex` si hay `q` libre. |
| Sitemap | Incluye `/explorar`. |
| Rails | Esta noche + rieles por género. Sin “Para ti” (sin sesión). |
| Mapa | Leaflet + teselas OSM HOT; pines pill con fecha. Sin Google/Mapbox. |
| Cards | `EventCard` compartido con landing y detalle. Enlace a `/eventos/{id}`. |
| Fuera de alcance | Bbox al pan, favoritos locales, AuthSheet, compra, infinite scroll. |

## Checklist

- [ ] `/explorar` tiene title, canonical, JSON-LD `CollectionPage` + `ItemList`.
- [ ] Chips actualizan la query y el listado.
- [ ] Wide: lista + mapa; compacto: FAB toggle.
- [ ] Landing/header apuntan a `/explorar` (no a Expo `/explore`).
- [ ] Doc indexada en `docs/README.md` y `AGENTS.md`.

## Relacionadas

[feat-001-event-detail-seo.md](feat-001-event-detail-seo.md). App: FEAT-005 / FEAT-006 / FEAT-032 en `app-frontend`.
