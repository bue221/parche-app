# FEAT-024: Wallet de tiquetes

Lista de lo que el asistente puede mostrar en puerta. Es el archivo, no la celebración de compra.

| Campo | Valor |
|-------|-------|
| Sprint | 3 |
| RC | RC-012 |
| Permiso UI | Attendee autenticado |
| Pantallas | Tab `Tiquetes` |

## Quick path

1. Abrir Tiquetes.
2. Ver talones `valid` (y estados secundarios).
3. Tap → [FEAT-025](feat-025-ticket-qr.md). Si hay emisión sin `print_seen` → [FEAT-023](feat-023-ticket-print.md) primero.

## Pantallas

Cards tipo pase (foto ancha + estado + Mostrar). Pull-to-refresh.

| Estado ticket | Lista |
|---------------|-------|
| valid | Primario; CTA mostrar |
| reserved | “Pago pendiente” |
| used | Tachado / “usado” |
| transferred | “Cedido” |
| cancelled | Ocultar o archivo |

## Flujo

`GET /v1/me/tickets`. Vacío: “Tu primera fecha” + CTA Agenda.

## Estados

Error: reintentar. Offline: mostrar último cache solo de metadatos; QR según 025.

## Contrato

Auth access. Cada item trae o permite fetch del ticket token.

## Fuera de alcance

Reventa marketplace. Apple Wallet pass (backlog). La animación de emisión (023).

## Checklist

- [ ] Tab inexistente si no hay sesión.
- [ ] Primera compra no salta la impresión.
- [ ] Used no parece válido.

## Relacionadas

[FEAT-023](feat-023-ticket-print.md), [FEAT-025](feat-025-ticket-qr.md), [FEAT-026](feat-026-ticket-transfer.md)
