# FEAT-003: Artistas, legal y CTAs de tienda

Fichas de artista indexables, páginas legales y CTAs de App Store / Play / app web controlados por env. Completa la superficie SEO pública junto a eventos y explorar.

| Campo | Valor |
|-------|-------|
| Superficie | `web-frontend` |
| Rutas | `/artistas/{id}`, `/legal/privacidad`, `/legal/terminos`, `/legal/cookies` |
| Render | Artistas: ISR 120s. Legal: estático. |
| Contrato | `GET /v1/artists/{id}`, `GET /v1/artists/{id}/events` |

## Quick path

1. Lineup de eventos publicados → IDs en sitemap de artistas (no hay list API público).
2. `/artistas/{uuid}` → Person JSON-LD + próximas fechas con `EventCard`.
3. Landing “en tendencia” y lineup del detalle enlazan a la ficha.
4. Footer enlaza legal; stores solo si `NEXT_PUBLIC_APP_STORE_URL` / `PLAY_STORE_URL` están seteados.
5. `not-found` apunta a `/explorar`.

## Details

| Topic | Decision |
|-------|----------|
| Artist ID | Solo UUID. Sin slug de artista en v1. |
| Sitemap artistas | Derivado de `lineup[].artistId` en publicados. |
| Stores | Vacío = no renderizar botón (no “próximamente” como link muerto). |
| Contacto | `NEXT_PUBLIC_CONTACT_EMAIL` (default `hola@parche.app`). |
| Legal | Copy base; contacto mailto desde `siteConfig.email`. |

## Checklist

- [ ] `/artistas/{id}` indexable con metadata + JSON-LD Person.
- [ ] Sitemap incluye artistas, hubs, legal y slugs de evento.
- [ ] CTAs App Store / Play solo con env.
- [ ] Footer → privacidad, términos, cookies.
- [ ] 404 con CTA a explorar.
- [ ] Doc indexada en `docs/README.md` y `AGENTS.md`.

## Relacionadas

[feat-001-event-detail-seo.md](feat-001-event-detail-seo.md), [feat-002-explore-seo.md](feat-002-explore-seo.md).
