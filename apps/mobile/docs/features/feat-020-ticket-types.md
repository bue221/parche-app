# FEAT-020: Etapas de boleta

El staff define qué se vende: nombre de etapa, precio, aforo, ventana. Sin esto no hay compra.

| Campo | Valor |
|-------|-------|
| Sprint | 3 |
| RC | RC-011 (precondición) |
| Permiso UI | `event.tickets.manage` |
| Pantallas | `TicketTypes` |

## Quick path

1. Operar → evento → etapas.
2. Crear etapa (ej. Preventa, Taquilla) con cupo y precio.
3. Detalle público lista etapas vendibles en ventana.

## Pantallas

Lista + formulario. Título **Etapas**. Sold out se marca en UI cuando disponibles = 0. No PII. Evento finalizado: lista en consulta, sin crear ni editar etapas.

## Flujo

CRUD según API de ticket_types (el PRD de backend lo agrupa en manage). Cerrar ventas = ventana `to` en el pasado.

## Estados

Evento sin etapas: detalle muestra “Aún no hay boletas a la venta”. Compra oculta.

## Contrato

Permiso `event.tickets.manage`. Moneda del tenant. Copy de producto: **etapa**, no “tipo de tiquete”.

## Fuera de alcance

Códigos de descuento. Mesas VIP complejas. Bundles (SKU empaquetado). Mezclar etapas del mismo evento en un pago es [FEAT-021](feat-021-ticket-purchase.md).

## Checklist

- [ ] `door` no edita etapas ni ve precios de dashboard (puede ver el precio público en detalle).
- [ ] Aforo 0 bloquea [FEAT-021](feat-021-ticket-purchase.md).
- [ ] Cambiar precio no altera orders ya `paid`.
- [ ] Evento finalizado no crea ni edita etapas.

## Relacionadas

[FEAT-021](feat-021-ticket-purchase.md), [FEAT-030](feat-030-event-metrics.md)
