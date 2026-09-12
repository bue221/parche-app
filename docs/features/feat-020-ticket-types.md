# FEAT-020: Tipos de tiquete

El staff define qué se vende: nombre, precio, aforo, ventana. Sin esto no hay compra.

| Campo | Valor |
|-------|-------|
| Sprint | 3 |
| RC | RC-011 (precondición) |
| Permiso UI | `event.tickets.manage` |
| Pantallas | `TicketTypes` |

## Quick path

1. Operar → evento → tiquetes.
2. Crear tipo (ej. Early, Door) con cupo y precio.
3. Detalle público lista tipos vendibles en ventana.

## Pantallas

Lista + formulario. Sold out se marca en UI cuando disponibles = 0. No PII.

## Flujo

CRUD según API de ticket_types (el PRD de backend lo agrupa en manage). Cerrar ventas = ventana `to` en el pasado.

## Estados

Evento sin tipos: detalle muestra “Aún no hay tiquetes”. Compra oculta.

## Contrato

Permiso `event.tickets.manage`. Moneda del tenant.

## Fuera de alcance

Códigos de descuento. Mesas VIP complejas. Bundles.

## Checklist

- [ ] `door` no edita tipos ni ve precios de dashboard (puede ver el precio público en detalle).
- [ ] Aforo 0 bloquea [FEAT-021](feat-021-ticket-purchase.md).
- [ ] Cambiar precio no altera orders ya `paid`.

## Relacionadas

[FEAT-021](feat-021-ticket-purchase.md), [FEAT-030](feat-030-event-metrics.md)
