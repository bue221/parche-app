# F17 Emisión de QR (ticket token)

Cuando el pago queda SUCCESS, cada tiquete `valid` recibe un **JWS** propio. Ese string es el QR. No es el UUID del ticket ni el access JWT.

**Depends on:** F16  
**Unlocks:** F18, F19  
**Stories:** RC-012

## Quick path

1. Al confirmar pago, para cada ticket: `jti` nuevo, firmar con `TICKET_SIGNING_KEY` (`kid` en header).
2. Guardar `tickets.jti` (hash o valor; jti es uuid, se guarda plano, no es un secreto de sesión).
3. `GET /v1/me/tickets` devuelve `qr_token` y metadatos de evento.
4. Rotar clave: JWKS interno con kids vigentes + grace.

## Claims JWS

| claim | valor |
|-------|--------|
| `tid` | ticket id |
| `eid` | event id |
| `jti` | unique |
| `exp` | `event.ends_at + 6h` |
| `iat` | now |

Alg: EdDSA/ES256 preferido; HS256 con key ≥ 32 bytes distinta de session.

## HTTP

### `GET /v1/me/tickets`

Access. Query `upcoming=true`. Cada item:

```json
{
  "ticket_id": "…",
  "event": { "id": "…", "title": "…", "starts_at": "…" },
  "status": "valid",
  "qr_token": "eyJ…"
}
```

No listar `used` en upcoming; sí en `?status=used`.

Re-emisión: si el cliente pierde el token, el GET **vuelve a firmar el mismo jti** (mismo QR) hasta transfer/use. No rotar jti en cada GET (el SETNX de F19 es por ticket_id, no jti; rotar jti en transfer F18).

## Seguridad

- Logs: nunca `qr_token`.
- Rate limit GET tickets.
- Screenshot: no es problema de API; opcional nonce corto **no** requerido si SETNX es por ticket_id.

## Checklist

- [ ] Key ≠ JWT_ACCESS
- [ ] exp cubre el evento
- [ ] GET me/tickets del dueño
- [ ] kid rotativo documentado en env `TICKET_SIGNING_KEYS` json

## Next step

[F18](F18-ticket-transfer.md), [F19](F19-door-checkin.md).
