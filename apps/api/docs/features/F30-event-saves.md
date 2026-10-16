# F30 Event saves y sync de interés

El asistente guarda fechas. Al pasar de invitado a cuenta, la app manda follows y saves locales.

**Depends on:** F08, F13, F04  
**Unlocks:** tab Guardados autenticado  
**Stories:** RC-009

## HTTP

| Método | Path | Auth |
|--------|------|------|
| POST | `/v1/events/{id}/save` | access |
| DELETE | `/v1/events/{id}/save` | access |
| GET | `/v1/me/saved-events` | access |
| POST | `/v1/me/sync` | access |
| GET | `/v1/me/invites` | access |

### `POST /v1/me/sync`

```json
{ "artist_ids": ["…"], "event_ids": ["…"] }
```

204. IDs desconocidos se ignoran. Follows reusan F13. Saves idempotentes.

### `GET /v1/me/invites`

Invitaciones `pending` del email o user. Sirve el badge de Operar en la app. No cambia F11 (memberships siguen active-only).

```json
{ "items": [{ "event_id": "…", "role": "door", "status": "pending" }] }
```

## Datos

`event_saves (user_id, event_id, created_at)` PK compuesto.

## Checklist

- [ ] Save dos veces = una fila
- [ ] Sync no falla la sesión si un id es basura
- [ ] Invites pending no se mezclan en `/v1/me/memberships`

## Next step

App [FEAT-037](../../../app-frontend/docs/features/feat-037-local-interest.md).
