# F19 Check-in multi-scanner

En la puerta hay **varios** dispositivos. El scan verifica firma en memoria, ACL de F11, y `SETNX` en Redis. Postgres se actualiza **después** vía worker.

**Depends on:** F11, F17, F18 (denylist), Redis F01  
**Unlocks:** F20 live counts  
**Stories:** RC-013

## Quick path

1. Staff con `event.door.scan` abre el evento activo.
2. `POST /v1/events/{eventId}/check-in` `{ "qr_token": "eyJ…" }`.
3. Verificar JWS (key ticket), `eid` == path, `exp`, jti no denylist, membership scan.
4. `SETNX ticket:used:{tid}` NX EX segundos hasta ends+7d. OK → `approved`. Exists → `duplicate`.
5. Publish `ticket.used` `{ ticket_id, event_id, scanner_user_id, ts }`.
6. Worker: `tickets.status=used`, `ticket_scan_logs` insert.
7. `GET .../door/live` aforo.

## HTTP

### `POST /v1/events/{eventId}/check-in`

Permiso `event.door.scan`. Body solo `qr_token`.

200 siempre con `result` (no 409 para duplicate: el cliente de puerta necesita un enum estable):

```json
{
  "result": "approved" | "duplicate" | "invalid" | "wrong_event" | "expired" | "forbidden",
  "ticket_id": "… | null",
  "scanned_at": "…"
}
```

HTTP 200 para approved/duplicate/wrong_event/expired/invalid. HTTP 403 si el **staff** no tiene permiso (`forbidden` también puede ser 403 sin body de ticket). **Decisión:** sin ACL → 403 envelope `FORBIDDEN`. QR malo → 200 `invalid` (no filtrar oráculos más de lo necesario; rate limit).

Nada de Postgres en este handler salvo opcional lectura membership si cache miss.

### `GET /v1/events/{eventId}/door/live`

`event.door.live` o `event.metrics.read`.

```json
{
  "sold": 100,
  "used": 37,
  "inside": 37,
  "capacity": 120,
  "recent": [{ "ts": "…", "scanner_user_id": "…", "result": "approved" }]
}
```

`recent` últimos 20; **sin** nombre del asistente para rol `door`. Metrics/owner pueden `?include=guest_name` (display_name del ticket user).

Contadores: Redis INCR en approved; worker reconcilia.

## Datos

`ticket_scan_logs`: id, ticket_id, event_id, scanner_user_id, result, created_at. Incluir duplicates para auditoría.

## Concurrencia

Dos doors, mismo QR: un SETNX gana. El otro duplicate. Ambos loguean.

## Errores / resultados

| Situación | result / HTTP |
|-----------|----------------|
| Firma rota | invalid / 200 |
| eid ≠ event | wrong_event / 200 |
| exp pasado | expired / 200 |
| jti denylist | invalid / 200 |
| SETNX fail | duplicate / 200 |
| Staff sin permiso | FORBIDDEN / 403 |

## Seguridad

- Rate limit por user.
- No persistir qr_token.
- Membership cache invalidation F11.

## Checklist

- [x] Postgres down: approved igual si Redis up (worker reintenta)
- [x] Dos scanners mismo ticket
- [x] Door no ve ingresos (eso es F20)
- [x] Live counts
- [x] Tests de firma / wrong event / duplicate

## Next step

[F20 métricas](F20-event-metrics.md).
