# F20 Métricas de evento

El promoter, manager y el rol `metrics` ven ventas, aforo y quién cubrió la puerta. El rol `door` **no** entra aquí.

**Depends on:** F11, F16, F19  
**Unlocks:** dashboard app  
**Stories:** métricas admin/promoter

## Quick path

1. `GET /v1/events/{id}/metrics` con `event.metrics.read`.
2. Agregados, no lista de compradores (eso es export aparte con el mismo permiso).
3. Serie por hora en el día del evento.

## HTTP

### `GET /v1/events/{id}/metrics`

```json
{
  "by_type": [{ "ticket_type_id": "…", "name": "Early", "sold": 40, "reserved": 2, "capacity": 50, "gross_cents": 4000000 }],
  "gross_cents": 4000000,
  "currency": "COP",
  "checkins": 22,
  "sold_valid_used": { "valid": 18, "used": 22, "cancelled": 0 },
  "no_show_rate": 0.0,
  "by_scanner": [{ "user_id": "…", "display_name": "Ana", "approved": 10, "duplicate": 1 }],
  "hourly": [{ "hour": "2026-09-11T22:00:00Z", "approved": 8 }]
}
```

`no_show_rate` = (sold used+valid after ends) / sold; 0 si el evento no termina.

### `GET /v1/events/{id}/metrics/orders`

Mismo permiso. Paginado: order id, amount, status, created. Email enmascarado `a***@x.co` para metrics; owner ve email completo.

### `GET /v1/events/{id}/metrics/export`

CSV de tiquetes (status, type, no QR). Solo owner/manager.

Door → 403.

## Cache

TTL 10s Redis. Invalidar en webhook y en worker scan.

## Checklist

- [ ] Door 403
- [ ] Metrics 200 sin PII extra en el resumen
- [ ] by_scanner cuadra con logs
- [ ] Export CSV owner

## Next step

[F21](F21-tenant-metrics.md).
