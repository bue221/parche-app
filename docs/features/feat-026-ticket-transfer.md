# FEAT-026: Transferir tiquete

El dueño cede el tiquete a otra cuenta Parche. El QR viejo deja de valer.

| Campo | Valor |
|-------|-------|
| Sprint | 3 |
| RC | RC-014 |
| Permiso UI | Dueño; ticket `valid` |
| Pantallas | `TicketTransfer` |

## Quick path

1. Desde QR o wallet → ceder.
2. Buscar usuario (email o id según API).
3. Confirmar nombre/avatar.
4. `POST /v1/tickets/{id}/transfer` → el emisor ve `transferred`; el destino recibe `valid` y [FEAT-023](feat-023-ticket-print.md) (primera vez para ese `ticket_id` en ese user).

## Pantallas

Confirmación explícita (dos taps). No compartir “captura de QR” como método.

## Flujo

Fallo: tiquete sigue del emisor. Destino sin cuenta: no hay transferencia a invitado (debe existir user).

## Estados

`used` / ya transferred: no abrir flujo. `GONE`/`CONFLICT`: recargar wallet.

## Contrato

Solo dueño. Destino autenticable en la plataforma.

## Fuera de alcance

Precio de reventa. Transfer a teléfono crudo / WhatsApp.

## Checklist

- [ ] QR anterior no pasa en puerta.
- [ ] Destino imprime de nuevo (023) al recibirlo.
- [ ] Confirmación no es un swipe accidental.

## Relacionadas

[FEAT-024](feat-024-ticket-wallet.md), [FEAT-023](feat-023-ticket-print.md)
