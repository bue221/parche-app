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

- [ ] Draft no público
- [ ] XSS: sanitizar HTML generado
- [ ] Cover por F03

## Next step

Web landing puede indexar posts. [F26](F26-transactional-email.md) digest no es masivo arbitrario; ver F26/F27.
