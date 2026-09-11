# F12 Artistas y lineup

El productor/DJ tiene ficha pública. El promoter los cuelga en el lineup del evento.

**Depends on:** F06, F08, F11 write  
**Unlocks:** F13, F22 filtro artist, F24  
**Stories:** RC-006, RC-007, RC-008

## Quick path

1. `POST /v1/artists` crea ficha (user con perfil artist o promoter creando “act” sin user).
2. `POST /v1/events/{id}/artists` vincula con slot/hora.
3. Detalle de evento incluye lineup; detalle artista incluye próximos eventos published.

## Datos

`artists`: id, user_id nullable unique, name, bio, avatar_asset_id, links (json: instagram, soundcloud), tenant_id nullable (si lo creó un promoter como act)  
`event_artists`: event_id, artist_id, billing_order, starts_at nullable, unique (event, artist)

## HTTP

### `POST /v1/artists`

Auth artist o promoter.

```json
{ "name": "…", "bio": "…", "avatar_asset_id": null, "links": {} }
```

Si caller es artist y ya tiene ficha user_id → 409. Promoter puede crear acts sin user.

### `GET /v1/artists/{id}`

Público.

### `PATCH /v1/artists/{id}`

Dueño: `user_id = me` o promoter del tenant que creó el act. No hijack.

### `POST /v1/events/{id}/artists`

`event.write`. `{ "artist_id", "billing_order", "starts_at"? }`. 204.

### `DELETE /v1/events/{id}/artists/{artistId}`

`event.write`. 204.

### `GET /v1/artists/{id}/events`

Published futuros/pasados paginados.

Avatar: F03 kind avatar con owner artist — permitir `owner_type=artist` en confirm asset (extender F09 o `POST /v1/artists/{id}/assets`). **Incluido:** `POST /v1/artists/{id}/assets` igual que evento, permiso dueño.

## Errores

| Caso | code |
|------|------|
| Segundo artist para mismo user | `CONFLICT` |
| Lineup duplicado | `CONFLICT` |

## Checklist

- [ ] Ficha pública sin email
- [ ] Lineup ordenado en detalle evento
- [ ] Promoter vincula artist existente
- [ ] PATCH solo dueño

## Next step

[F13 follows](F13-artist-follows.md).
