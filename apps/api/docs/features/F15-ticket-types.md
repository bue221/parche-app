# F15 Tipos de tiquete y aforo

Antes de vender, el evento declara qué se vende: precio, cupo, ventana. El aforo se reserva en F16; aquí está el catálogo.

**Depends on:** F08, F11 `event.tickets.manage`  
**Unlocks:** F16  
**Stories:** RC-011 (prep)

## Quick path

1. CRUD `ticket_types` por evento.
2. `capacity` entero ≥ 0 (`0` = ilimitado no permitido: mínimo 1 o usar null ilimitado). **Decisión: capacity obligatorio ≥ 1.**
3. Públicos ven tipos `on_sale` del evento published.

## Datos

`ticket_types`: id, event_id, name (`Early`, `Door`), price_cents, currency (copia tenant), capacity, sold_count, reserved_count, sales_starts_at, sales_ends_at, status (`draft`|`on_sale`|`paused`|`sold_out`).

Invariante: `reserved_count + sold_count ≤ capacity` (trigger o transacción).

## HTTP

### `PUT /v1/events/{id}/ticket-types`

`event.tickets.manage`. Upsert lista. No borrar tipo con sold>0: `archived`.

### `GET /v1/events/{id}/ticket-types`

Público si evento published: solo on_sale/sold_out. Miembros: todos.

No se compra aquí.

## Errores

| Caso | code |
|------|------|
| Bajar capacity < sold+reserved | `CONFLICT` |
| Precio negativo | `VALIDATION_ERROR` |
| Door user PUT | `FORBIDDEN` |

## Checklist

- [x] Cupo no negativo
- [x] Pausar ventas
- [x] Público no ve draft types

## Next step

[F16 checkout](F16-checkout-payments.md).
