# FEAT-022: Vuelta de pago

Al cerrar la pasarela, la app pregunta al API cómo quedó la order. El webhook es la verdad; el cliente solo hace poll/get.

| Campo | Valor |
|-------|-------|
| Sprint | 3 |
| RC | RC-011 |
| Permiso UI | Dueño de la order |
| Pantallas | `OrderStatus` |

## Quick path

1. Deep link / return URL de pasarela → esta pantalla con `order_id`.
2. `GET /v1/orders/{id}` hasta `paid` | `failed` | `expired` (timeout de espera).
3. `paid` → [FEAT-023](feat-023-ticket-print.md). Otro → copy de fallo y CTA volver al evento.

## Pantallas

Estado pendiente: spinner + “Confirmando el pago” (sin verde `confirm` aún). No mostrar QR aquí.

## Flujo

Poll con backoff corto. Máximo razonable; luego “Sigue pendiente — revisa Tiquetes”. Si más tarde está paid, wallet + impresión pendiente.

Usuario mata la app a mitad: al reabrir Tiquetes, si hay `valid` sin “print seen”, se lanza 023.

## Estados

`FORBIDDEN` si no es el dueño. Order inexistente: GONE.

## Contrato

`GET /v1/orders/{id}`. No hay endpoint de “confirmar pago” desde el cliente.

## Fuera de alcance

Reimplementar webhook. Reembolsos.

## Checklist

- [ ] QR no se muestra en pending.
- [ ] paid siempre pasa por impresión la primera vez.
- [ ] failed no deja reserved eterno en UI.

## Relacionadas

[FEAT-021](feat-021-ticket-purchase.md), [FEAT-023](feat-023-ticket-print.md), [FEAT-035](feat-035-deep-links.md)
