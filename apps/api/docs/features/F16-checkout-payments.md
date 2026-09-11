# F16 Checkout y pagos

El asistente pide tiquetes; el API reserva aforo, manda a la pasarela y confirma por webhook **idempotente**. Sin esto no hay QR (F17).

**Depends on:** F15, F01 broker, F02 idempotency  
**Unlocks:** F17, F20  
**Stories:** RC-011

## Quick path

1. `POST /v1/events/{id}/orders` + `Idempotency-Key`.
2. Transacción: Order `pending`, Tickets `reserved`, `reserved_count++`.
3. Respuesta `checkout_url`.
4. Webhook firma + replay window → PaymentTransaction SUCCESS → tickets `valid` + emitir QR (F17) + `reserved_count--` `sold_count++`.
5. TTL reserva 15 min: job libera si pending.

## HTTP

### `POST /v1/events/{id}/orders`

Access attendee. Evento `published`.

```json
{
  "items": [{ "ticket_type_id": "…", "quantity": 1 }]
}
```

Máx 8 tiquetes por order. Quantity ≥ 1.

201:

```json
{
  "order_id": "…",
  "status": "pending",
  "checkout_url": "https://pasarela/…",
  "expires_at": "…"
}
```

409 si no hay cupo. 400 si sales window cerrada.

Pasarela: adapter `PaymentProvider` (`CreateCheckout(order)`). Dev: driver `fake` que redirige a `/dev/pay/{order}` y simula webhook. Prod: Wompi/Stripe/etc. **sin** hardcode en handlers.

### `GET /v1/orders/{id}`

Solo comprador o tenant con metrics.read. Status, items, no PAN.

### `POST /v1/payments/webhook`

Sin Bearer. Header firma (`X-Payment-Signature`). Body crudo.

- Verificar HMAC `PAYMENT_WEBHOOK_SECRET`.
- Timestamp ± 5 min.
- `provider_event_id` unique → skip duplicados.
- Estados: `success` | `failed`.

Success: F17 issue tokens. Failed: tickets `cancelled`, liberar reserved.

### `POST /v1/dev/payments/simulate` (solo `APP_ENV=dev`)

Dispara webhook interno. No existe en prod.

## Datos

`orders`: user_id, event_id, status, expires_at, amount_cents  
`order_items`: ticket_type_id, quantity, unit_price_cents  
`tickets`: order_id, ticket_type_id, status, user_id  
`payment_transactions`: order_id, provider, provider_event_id unique, status, raw_payload_hash (no loguear payload completo en log stdout; sí en tabla cifrada o truncada)

## Errores

| Caso | code |
|------|------|
| Sin cupo | `CONFLICT` |
| Webhook firma mala | 401 `UNAUTHORIZED` |
| Evento no published | `FORBIDDEN` |

## Seguridad

- Nunca confiar en query “?paid=1” del cliente.
- Idempotency-Key 24h Redis/DB.
- Worker `order.expire` cada minuto.

## Checklist

- [ ] Reserva se libera a los 15 min
- [ ] Webhook duplicado no duplica tickets
- [ ] Fake provider en compose
- [ ] Driver S3-less: adapter pagos env

## Next step

[F17 QR](F17-ticket-qr.md).
