# F14 Perfil personal

El asistente (y cualquiera) edita nombre y foto. Es su identidad en Parche, distinta de la ficha F12.

**Depends on:** F03, F04  
**Unlocks:** RC-010  
**Stories:** RC-010

## Quick path

1. `GET /v1/me` ya en F04; este feature cubre `PATCH` y avatar.
2. Upload kind `avatar` sin event_id.
3. Confirm `POST /v1/me/avatar` con key.

## HTTP

### `PATCH /v1/me`

```json
{ "display_name": "…", "bio": "…" }
```

Bio máx 280. Email **no** se cambia aquí (requeriría verify; **incluido:**)

### `POST /v1/me/email/change`

`{ "email": "nuevo" }` → token mail F26 `email_change` → `POST /v1/me/email/confirm` `{ "token" }`. Email nuevo único.

### `POST /v1/me/avatar`

`{ "key": "users/{id}/avatar/…" }`. Exists + prefix. Update `users.avatar_asset_id`.

### `GET /v1/users/{id}`

Público mínimo: display_name, avatar_url. Sin email. 404 si disabled.

## Checklist

- [x] PATCH nombre
- [x] Avatar presign + confirm
- [x] Cambio de email con verify
- [x] Perfil público sin PII

## Next step

[F15](F15-ticket-types.md).
