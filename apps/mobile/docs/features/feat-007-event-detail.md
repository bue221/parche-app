# FEAT-007: Detalle de evento

Una sola pantalla cuenta la fecha: foto hero, copy Inter, lineup, mapa del pin, audio y CTA sticky de compra. Staff va a un sheet secundario.

| Campo | Valor |
|-------|-------|
| Sprint | 1; 2–3 añaden bloques |
| RC | RC-005 |
| Permiso UI | Público + CTAs gated |
| Pantallas | `EventDetail` |

## Quick path

1. Entrar desde Agenda, mapa o deep link.
2. Ver foto, fecha, venue, descripción, pin.
3. CTA sticky: Comprar si hay tipos a la venta; si no, “Pronto”.

## Pantallas

| Bloque | Sprint | Spec |
|--------|--------|------|
| Flyer + datos | 1 | este |
| Mapa del pin (solo lectura) | 1 | coords API |
| Lineup | 2 | [FEAT-015](feat-015-event-lineup.md) |
| Tracks | 2 | [FEAT-017](feat-017-event-tracks.md) |
| Comprar | 3 | [FEAT-021](feat-021-ticket-purchase.md) |
| Editar / media | 1–2 | `event.write` |
| Puerta / métricas | 3 | permisos de membresía |
| Estado publicación | 3 | [FEAT-031](feat-031-admin-approval.md) |

CTAs nunca mezclan “escanear” y “comprar” en el mismo botón.

## Flujo

`GET /v1/events/{id}`. 404/GONE: pantalla “Esta fecha ya no está”.

## Estados

Borrador/en revisión: solo staff del evento. Público: cualquiera.

## Contrato

Auth opcional. Acciones extra fallan `FORBIDDEN` y se ocultan.

## Fuera de alcance

Editor inline de todo el evento (usa [FEAT-009](feat-009-event-edit.md)). Scanner embebido (pantalla propia).

## Checklist

- [ ] Invitado lee el detalle.
- [ ] `door` ve entrar a scanner, no ingresos.
- [ ] Pin coincide con Explorar.

## Relacionadas

[FEAT-021](feat-021-ticket-purchase.md), [FEAT-027](feat-027-operate-hub.md)
