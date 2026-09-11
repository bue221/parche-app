# F21 Métricas de tenant

El dueño del colectivo ve caja y volumen **entre eventos**, no solo una noche.

**Depends on:** F06, F20  
**Unlocks:** `tenant.billing.read`  
**Stories:** promoter dashboard

## Quick path

1. Permiso: `tenant_members.role=owner` (o `staff` read-only si se marca `can_billing`). **Decisión: solo owner.**
2. `GET /v1/tenants/{id}/metrics?from&to`.
3. Suma gross de orders paid, tickets sold, eventos published, checkins.

## HTTP

```json
{
  "from": "…", "to": "…",
  "gross_cents": 0,
  "orders_paid": 0,
  "tickets_sold": 0,
  "events_published": 0,
  "by_event": [{ "event_id": "…", "title": "…", "gross_cents": 0, "sold": 0 }]
}
```

Rango máx 366 días. Default últimos 30.

## Checklist

- [x] Staff tenant sin billing 403
- [x] Platform admin puede consultar cualquier tenant (F27)
- [x] Cuadra con suma de F20

## Next step

[F27](F27-platform-admin.md) para vista global.
