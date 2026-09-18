# FEAT-040: Tab Favoritos

La segunda tab se llama **Favoritos**. Es un tablero de colecciones (estilo wishlists): fotos grandes en grilla de 2 columnas, no un feed de cards. El invitado ve recents y guardados locales. Boletas es un tab separado ([FEAT-024](feat-024-ticket-wallet.md)).

| Campo | Valor |
|-------|-------|
| Sprint | 4 |
| RC | RC-012, RC-016 |
| Permiso UI | Público (local) + API con Bearer |
| Pantallas | Tab `/favorites`; detalle `/collection/[id]` |

## Quick path

1. Invitado abre Favoritos: ve colecciones locales (recientes, fechas por ciudad/año, artistas).
2. Logueado: las mismas colecciones mezclan local + API.
3. Tap en una colección → listado de fechas o artistas. Tap en un ítem → detalle.

## Pantallas

| Pieza | Regla |
|-------|-------|
| Header | Título Inter "Favoritos". Sin lead. `headerAction` **Edita** / **Listo**: pill `bg-muted`, sentence case, hit ≥44px. |
| Grilla | 2 columnas en teléfono. Cada tile: foto cuadrada `rounded-images` + título 16/700 + subtítulo muted. |
| Vistos recientemente | Primera tile si hay visitas. Collage 2×2 de flyers. Subtítulo relativo (`Hace 2 semanas`). Local `parche.recent.v1`. |
| Fechas | Una colección por **ciudad + año** (`Bogotá 2026`). Cover = primer flyer. Subtítulo `N guardados`. |
| Artistas | Una colección si hay follows. Cover = primer avatar. Subtítulo `N seguidos`. |
| Edita | En edición, X en la foto vacía la colección (limpia recents, unsaves fechas o unfollows artistas). Listo sale del modo. |
| Detalle | `/collection/[id]` con `Screen back`. Fechas = grilla 2 columnas de `EventCard` listing + corazón. Artistas = `ArtistRow`. |
| Empty | "Nada guardado aún" + CTA Explorar si no hay recents ni guardados. |

## Flujo

- `useInterestStore` para IDs locales (`eventIds`, `artistIds`).
- `useRecentStore` registra cada apertura de detalle de evento.
- `GET /v1/me/saved-events` + `GET /v1/me/following` si está logueado.
- Merge local + API, deduplicar por ID; las colecciones se derivan, no se persisten nombres.

## Contrato

[FEAT-037](feat-037-local-interest.md) para local interest. `GET /v1/me/saved-events`, `GET /v1/me/following` para API. Recents son solo dispositivo.

## Fuera de alcance

Boletas (tab separado). Wishlists con nombre libre. Orden drag-and-drop. Recents de artistas.

## Checklist

- [ ] Tablero 2 columnas: collage de recientes + tiles de ciudad/año + artistas.
- [ ] Edita / Listo; X vacía la colección.
- [ ] Invitado ve recents y guardados locales sin login.
- [ ] Logueado ve merge de local + API.
- [ ] Tap en colección abre el listado; tap en fecha o artista abre el detalle.
- [ ] Empty state incluye CTA para explorar.

## Relacionadas

[FEAT-001](feat-001-shell-navigation.md), [FEAT-007](feat-007-event-detail.md), [FEAT-024](feat-024-ticket-wallet.md), [FEAT-037](feat-037-local-interest.md)
