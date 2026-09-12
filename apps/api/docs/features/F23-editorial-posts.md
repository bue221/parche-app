# F23 Editorial / posts

Contenido de cultura techno y novedades, no es el feed de eventos.

**Depends on:** F04, F06, F03 (cover opcional)  
**Unlocks:** RC-019  
**Stories:** RC-019

## Quick path

1. `platform_admin` (o promoter con flag) crea posts.
2. Listado público paginado.
3. Slug único, markdown sanitizado (tags allowlist).

## Datos

`posts`: id, slug, title, body_md, cover_asset_id, status (`draft`|`published`), author_id, published_at.

## HTTP

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/v1/posts` | público, solo published |
| GET | `/v1/posts/{slug}` | público published |
| POST | `/v1/admin/posts` | platform_admin |
| PATCH | `/v1/admin/posts/{id}` | platform_admin |
| POST | `/v1/admin/posts/{id}/publish` | platform_admin |

## Checklist

- [x] Draft no público
- [x] XSS: sanitizar HTML generado
- [x] Cover por F03

## Next step

La app Expo **no** lee posts. Un blog público en `web-frontend` (ISR, slug, JSON-LD) puede indexar `GET /v1/posts` más adelante. No borrar este API. [F26](F26-transactional-email.md) digest no es masivo arbitrario; ver F26/F27.
