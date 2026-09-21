# FEAT-021: Comprar tiquete

El asistente reserva aforo y paga. El tiquete `valid` no se muestra como QR hasta que el pago confirma y corre la impresión ([FEAT-023](feat-023-ticket-print.md)).

| Campo | Valor |
|-------|-------|
| Sprint | 3 |
| RC | RC-011 |
| Permiso UI | `attendee` autenticado |
| Pantallas | `Checkout` (stack desde detalle) |

## Quick path

1. Detalle → cantidades por etapa (mismo evento).
2. CTA; no doble tap.
3. `POST /v1/events/{id}/orders` con `items[]` → order `pending`, tickets `reserved`.
4. Abrir Mercado Pago (`checkout_url` / `init_point`) en el navegador in-app (Custom Tabs / Safari View Controller). Sin WebView y sin campos de tarjeta en Parche.
5. Vuelta: [FEAT-022](feat-022-order-return.md).

## Pantallas

Resumen: flyer compacto + evento, etapas como cards de precio (aurora border si hay cantidad), total en el sticky, política corta. CTA **Pagar $X**. El cobro corre en una hoja de Mercado Pago encima de Parche (no en Safari/Chrome como app aparte). Las etapas del mismo evento se mezclan en un solo pago; no hay carrito entre eventos.

Invitado: el checkout se abre igual; al confirmar, AuthSheet OTP/Google inline ([FEAT-038](feat-038-auth-otp.md)). No redirige a register. Nombre/teléfono van a [FEAT-041](feat-041-complete-profile.md) después.

## Flujo

| Order | Ticket | UI |
|-------|--------|-----|
| pending | reserved | “Reservado — completa el pago” |
| paid | valid | Dispara impresión 023 |
| failed / expired | liberados | “No se completó; el cupo se liberó” |

La app **no** marca `valid` en local.

## Estados

`CONFLICT` aforo: bajar cantidad de esa etapa o elegir otra. La order es atómica: si una línea no tiene cupo, no se reserva ninguna. Red: un retry idempotente del botón (mismo intento, no N orders). Evento finalizado: checkout en consulta, CTA Finalizado, el mock rechaza `createOrder`.

## Contrato

`POST /v1/events/{id}/orders` con `{ items: [{ ticket_type_id, quantity }] }`, `GET /v1/orders/{id}`.

## Fuera de alcance

Wallet Apple/Google Pay nativo salvo que la pasarela lo abra. Impresión (spec 023). Transfer (026).

## Checklist

- [ ] Sin sesión no hay order (sí hay carrito + sheet).
- [ ] CTA no crea dos orders por doble tap.
- [ ] Varias etapas del mismo evento salen en una order y un pago.
- [ ] Tras paid no se salta la animación de impresión la primera vez.
- [ ] Evento finalizado no crea order.

## Relacionadas

[FEAT-022](feat-022-order-return.md), [FEAT-023](feat-023-ticket-print.md)
