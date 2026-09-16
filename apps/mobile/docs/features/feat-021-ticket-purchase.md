# FEAT-021: Comprar tiquete

El asistente reserva aforo y paga. El tiquete `valid` no se muestra como QR hasta que el pago confirma y corre la impresión ([FEAT-023](feat-023-ticket-print.md)).

| Campo | Valor |
|-------|-------|
| Sprint | 3 |
| RC | RC-011 |
| Permiso UI | `attendee` autenticado |
| Pantallas | `Checkout` (stack desde detalle) |

## Quick path

1. Detalle → elegir tipo y cantidad.
2. CTA; no doble tap.
3. `POST /v1/events/{id}/orders` → order `pending`, tickets `reserved`.
4. Abrir pasarela (URL del API).
5. Vuelta: [FEAT-022](feat-022-order-return.md).

## Pantallas

Resumen: evento, tipo, total, política corta. Sin campos de tarjeta en Parche (pasarela externa).

Invitado: el checkout se abre igual; al confirmar, AuthSheet OTP/Google inline ([FEAT-038](feat-038-auth-otp.md)). No redirige a register. Nombre/teléfono van a [FEAT-041](feat-041-complete-profile.md) después.

## Flujo

| Order | Ticket | UI |
|-------|--------|-----|
| pending | reserved | “Reservado — completa el pago” |
| paid | valid | Dispara impresión 023 |
| failed / expired | liberados | “No se completó; el cupo se liberó” |

La app **no** marca `valid` en local.

## Estados

`CONFLICT` aforo: elegir otro tipo. Red: un retry idempotente del botón (mismo intento, no N orders).

## Contrato

`POST /v1/events/{id}/orders`, `GET /v1/orders/{id}`.

## Fuera de alcance

Wallet Apple/Google Pay nativo salvo que la pasarela lo abra. Impresión (spec 023). Transfer (026).

## Checklist

- [ ] Sin sesión no hay order (sí hay carrito + sheet).
- [ ] CTA no crea dos orders por doble tap.
- [ ] Tras paid no se salta la animación de impresión la primera vez.

## Relacionadas

[FEAT-022](feat-022-order-return.md), [FEAT-023](feat-023-ticket-print.md)
