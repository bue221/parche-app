# FEAT-034: Editorial / posts (aplazado)

Lectura de cultura techno **no vive en la app**. El API público queda para un blog futuro en `web-frontend`.

| Campo | Valor |
|-------|-------|
| Sprint | — (aplazado) |
| RC | RC-019 |
| Estado | Fuera de la app; backend F23 intacto |
| Superficie futura | Blog en `web-frontend` |

## Quick path

No hay pantallas en Expo. No enlazar `/posts` desde Parche ni el nav web.

## Details

| Topic | Decision |
|-------|----------|
| App | Sin feed, detalle, nav ni cliente `api.feed.posts`. |
| API | `GET /v1/posts` y admin posts siguen; no borrar F23. |
| Web | Blog ISR/indexable cuando se retome. No CMS en la app. |

## Fuera de alcance ahora

UI de lectura en Expo. Editor WYSIWYG. Newsletter masiva.

## Checklist

- [x] App no muestra Editorial.
- [ ] Blog público en Next (futuro).

## Relacionadas

[F23](../../../backend/docs/features/F23-editorial-posts.md)
