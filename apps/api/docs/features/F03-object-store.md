# F03 Object store

Flyers, avatares y audios no se guardan “en un folder de Go”. Todo pasa por el puerto `ObjectStore`. En laptop es MinIO (o disco); en prod, S3. Los handlers no importan el SDK de AWS.

**Depends on:** F01, F02  
**Unlocks:** F09, F10, F14  
**Stories:** media de evento, RC-003/010

## Quick path

1. Interfaz `ObjectStore`: `PutPresign`, `GetPublicURL`, `GetPresign`, `Delete`, `Exists`.
2. Drivers: `minio`, `fs` (`./data/media`), `s3`.
3. `POST /v1/uploads` emite presign; el binario **no** recibe el archivo en el API (salvo fallback `fs` en tests).
4. Keys: `{tenant_id}/{event_id|user_id}/{kind}/{uuid}.{ext}`.

## Puerto

```
PutPresign(ctx, key, contentType, maxBytes, ttl) → { method, url, headers, expires_at }
GetPublicURL(key) → string          // flyer/gallery/avatar públicos
GetPresign(ctx, key, ttl) → url     // audio / privados
Delete(ctx, key)
Exists(ctx, key) → bool
```

`OBJECT_STORE_DRIVER=s3` no cambia handlers. CloudFront opcional: `GetPublicURL` puede prefijar CDN.

## HTTP

### `POST /v1/uploads`

Auth: access. Body:

```json
{
  "kind": "flyer" | "gallery" | "avatar" | "audio",
  "content_type": "image/jpeg",
  "byte_size": 1200000,
  "event_id": "uuid | null"
}
```

Reglas:

- `avatar`: `event_id` omitido; prefix `users/{user_id}/avatar/`.
- flyer/gallery/audio: `event_id` obligatorio; el user necesita `event.write` (F11) o ser owner al crear (F08).
- Rechazar MIME/tamaño **antes** del presign.

200:

```json
{
  "key": "tnt_…/evt_…/flyer/….webp",
  "upload": { "method": "PUT", "url": "https://…", "headers": { "Content-Type": "image/jpeg" }, "expires_at": "…" }
}
```

TTL presign: **5 minutos**. `Content-Type` del PUT debe coincidir exactamente.

Límites:

| kind | MIME | Máx |
|------|------|-----|
| flyer, gallery, avatar | jpeg, png, webp | 8 MB |
| audio | mpeg, ogg, wav, mp4 (`audio/mp4`) | 80 MB fuente; el preview transcodeado (F10) ≤ 20 MB |

400 `VALIDATION_ERROR` si se pasa. 403 si no hay permiso sobre el evento.

El registro en tabla `assets` lo hace F09/F10/F14 al **confirmar**, no este POST.

## Datos

No hay fila hasta confirmación. Opcional: tabla `upload_intents` (`key`, `user_id`, `expires_at`) para borrar huérfanos (worker diario).

## Seguridad

- Key generada **solo** en servidor. El cliente no elige el path.
- Verificar prefix tenant/user al confirmar.
- Bucket: block public ACL; URLs firmadas o CDN con path conocido solo para kinds públicos.
- No loguear querystring de presign.

## Errores

| Caso | code |
|------|------|
| MIME no permitido | `VALIDATION_ERROR` |
| size > máx | `VALIDATION_ERROR` |
| MinIO/S3 caído al firmar | `INTERNAL` |
| Confirmar key inexistente (F09) | `NOT_FOUND` |

## Checklist

- [x] Un test usa driver `fs` o MinIO y completa PUT + Exists
- [x] Cambiar driver a `s3` es env-only
- [x] Presign expira; un PUT tarde falla en el store
- [x] Avatar no puede escribirse bajo `events/`

## Next step

[F09 media](F09-event-media.md) usa este puerto. Auth de sesión: [F04](F04-auth-session.md).
