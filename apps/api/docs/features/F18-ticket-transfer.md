# F18 Transferencia de tiquete

El asistente cede un tiquete `valid` a otro usuario. El QR anterior deja de ser válido.

**Depends on:** F17  
**Unlocks:** RC-014  
**Stories:** RC-014

## Quick path

1. `POST /v1/tickets/{id}/transfer` `{ "to_email" | "to_user_id" }`.
2. Destino debe tener cuenta (si email sin cuenta: invite F26 `ticket_claim` + pending). **Incluido:** claim token 48h.
3. Nuevo `jti`; viejo en Redis denylist `ticket:jti:{old}` TTL hasta exp.
4. `user_id` del ticket cambia; email a ambos (F26).

## HTTP

### `POST /v1/tickets/{id}/transfer`

Dueño actual. Ticket `valid`, no used. 204 o 200 ticket.

### `POST /v1/tickets/claims/{token}/accept`

Access. Email match. Completa transfer si estaba pending.

No transferir `reserved`. No transferir a uno mismo.

Límite: 3 transfers por ticket (columna `transfer_count`) anti-scalping liviano.

## Errores

| Caso | code |
|------|------|
| Already used | `CONFLICT` |
| Not owner | `FORBIDDEN` |
| Too many transfers | `CONFLICT` |
| Claim expired | `GONE` |

## Checklist

- [x] QR viejo → F19 `invalid` (firma ok pero jti denylist `ticket:jti:{old}` hasta exp)
- [x] Destino ve el ticket en /me/tickets
- [x] Emails enviados
- [x] Máx 3 cesiones

## Next step

[F19](F19-door-checkin.md) debe consultar denylist.
