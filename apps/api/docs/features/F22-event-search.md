# F22 Búsqueda y filtros de eventos

El asistente encuentra el parche por texto, fecha, género, DJ y mapa.

**Depends on:** F08, F07, F12  
**Unlocks:** RC-017, Explore en Expo  
**Stories:** RC-017

## Quick path

Extender `GET /v1/events`:

| Query | Semántica |
|-------|-----------|
| `q` | ILIKE title/description, trigram si Postgres `pg_trgm` |
| `from` `to` | overlaps starts_at |
| `genre` | overlap genres[] (multi: `genre=techno&genre=acid`) |
| `artist_id` | lineup |
| `min_lat` `min_lng` `max_lat` `max_lng` | F07 |
| `cursor` `limit` | F02 |

Solo `published`. Vacío = agenda por `starts_at asc`.

Índices: GIN genres, trigram title, (starts_at), venue coords.

Invalidar caché: incluir hash de query en key (F08).

## Errores

`q` > 80 chars → `VALIDATION_ERROR`. Bbox enorme → F07.

## Checklist

- [x] Combinar q + genre + bbox
- [x] artist_id filtra lineup
- [x] No leak drafts
- [x] OpenAPI query params

## Next step

Explore UI consume esto. [F24](F24-recommendations.md) es otro ranking.
