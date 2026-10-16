# F11 Miembros e invitaciones de evento

Varias personas operan el mismo parche: owner, manager, puerta, métricas. El JWT de sesión **no** lista esos permisos; cada request carga membresía (cache Redis).

**Depends on:** F04, F08  
**Unlocks:** F09 write, F19 scan, F20 metrics  
**Stories:** permisos, multi door, RC-013 staff

## Quick path

1. Al crear evento (F08), insert `event_members` owner = creator.
2. Owner invita por email o user_id.
3. Invitado acepta. Revocar invalida cache → check-in 403 aunque el access siga vivo.
4. Autorizar por **permiso atómico**, no por string de rol suelto en el handler.

## Roles → permisos

| Permiso | owner | manager | door | metrics |
|---------|-------|---------|------|---------|
| `event.write` | sí | sí | no | no |
| `event.publish` | sí | sí | no | no |
| `event.members.manage` | sí | sí (no promover owner, no borrar owner) | no | no |
| `event.metrics.read` | sí | sí | no | sí |
| `event.door.scan` | sí | no | sí | no |
| `event.door.live` | sí | sí | sí | sí |
| `event.tickets.manage` | sí | sí | no | no |
| Transferir ownership | sí | no | no | no |

Owner siempre ≥1. `platform_admin` no recibe estos permisos salvo impersonation explícita F27 (`as_tenant` no existe: admin no escanea).

## Datos

`event_members`: event_id, user_id, role, status (`active`|`revoked`), unique (event, user)  
`event_invites`: event_id, email, role, token_hash, expires_at (7 días), accepted_at, invited_by

## HTTP

### `GET /v1/events/{id}/members`

`event.members.manage` **o** owner. Lista user_id, display_name, role, status. Door no lista.

### `POST /v1/events/{id}/members`

`event.members.manage`. Body `{ "email" | "user_id", "role": "manager"|"door"|"metrics" }`. No `owner` por este POST.

- Si user existe: member `active` inmediato **o** invite pending si se quiere aceptación. **Decisión: invite always pending** salvo user_id del mismo tenant staff → active. Más simple y seguro: **siempre pending + email** (F26 `event_invite`).
- 201 invite `{ id, expires_at }`.

### `POST /v1/invites/{token}/accept`

Access. Email del user debe coincidir (o invite por user_id). Crea member active. 204.

### `PATCH /v1/events/{id}/members/{userId}`

Cambia role. No degradar al último owner.

### `DELETE /v1/events/{id}/members/{userId}`

status=revoked (no borrar fila: auditoría). Invalida Redis `event:{id}:members`.

### `POST /v1/events/{id}/transfer-ownership`

Body `{ "user_id" }`. Solo owner. El nuevo debe ser member active. Caller pasa a manager.

### `GET /v1/me/memberships`

Lista eventos con role active.

## Cache

Redis hash `event:{id}:acl` user_id → permisos JSON. TTL 5 min + invalidar en write. Check-in (F19) lee esto, no el JWT.

## Email

F26 template `event_invite` con deep link token.

## Errores

| Caso | code |
|------|------|
| Door GET members | `FORBIDDEN` |
| Invite owner role | `VALIDATION_ERROR` |
| Accept email mismatch | `FORBIDDEN` |
| Revoke last owner | `CONFLICT` |

## Checklist

- [x] Dos doors en el mismo evento
- [x] Revoke → scan 403 con access aún válido
- [x] Metrics no escanea; door no ve F20 ingresos
- [x] Tests de matriz de permisos

## Next step

[F19](F19-door-checkin.md) y [F20](F20-event-metrics.md) consumen esta ACL.
