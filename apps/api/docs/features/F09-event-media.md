# F09 Media de evento (imágenes)

Un evento tiene flyer principal y galería. Tras el PUT al store (F03), el API confirma el objeto, guarda metadatos y dispara thumbnail.

**Depends on:** F03, F08, F11 (`event.write`)  
**Unlocks:** F08 submit, listados con imagen  
**Stories:** flyers, RC-003/005

## Quick path

1. Cliente `POST /v1/uploads` kind flyer|gallery.
2. PUT al presign.
3. `POST /v1/events/{id}/assets` con key.
4. Worker `media.process` genera thumb webp 800px; flyer_asset_id si kind=flyer.

## HTTP

### `POST /v1/events/{id}/assets`

Permiso `event.write`.

```json
{ "key": "…", "kind": "flyer" | "gallery" }
```

- Exists(key); prefix `{tenant}/{event_id}/`.
- Lee size/content-type del store (head).
- Insert `assets`. Si flyer, update `events.flyer_asset_id` (el anterior sigue en gallery o se marca superseded).
- Publica `media.process` `{ asset_id }`.
- 201 asset `{ id, kind, public_url, thumb_url? }`.

### `GET` embebido

Detalle de evento incluye `flyer`, `gallery[]` con urls públicas.

### `DELETE /v1/events/{id}/assets/{assetId}`

`event.write`. No borrar el único flyer si status pending/published (o exigir reemplazo). Delete objeto + thumbs.

### `POST /v1/uploads`

Ya en F03.

## Datos

`assets`: id, tenant_id, owner_type (`event`|`user`|`artist`), owner_id, kind, key, thumb_key, mime, bytes, width, height, created_by.

## Worker thumbnail

- Decode jpeg/png/webp; resize máx 1600 flyer / 800 thumb.
- Strip EXIF GPS.
- Si el decode falla: asset `status=failed`; el original se conserva; submit de evento no usa failed como flyer.

## Seguridad

- Confirmar solo keys emitidas por uploads de ese user (tabla `upload_intents`) **incluido**: intents de F03 se validan aquí.
- Hotlink: urls públicas ok para flyer (CDN).

## Errores

| Caso | code |
|------|------|
| Key no existe | `NOT_FOUND` |
| Prefix ajeno | `FORBIDDEN` |
| Kind audio en este endpoint | `VALIDATION_ERROR` (usar F10) |

## Checklist

- [x] Flyer aparece en GET público
- [x] Thumb se genera
- [x] EXIF GPS no se sirve
- [x] Delete no deja huérfanos en MinIO (best-effort + job)

## Next step

[F10 audio](F10-event-audio.md).
