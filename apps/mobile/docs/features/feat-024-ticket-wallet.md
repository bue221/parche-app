# FEAT-024: Wallet de tiquetes (Tab Boletas)

Lista de lo que el asistente puede mostrar en puerta. Es el archivo, no la celebración de compra. Ahora es un tab separado llamado **Boletas**.

| Campo | Valor |
|-------|-------|
| Sprint | 3 |
| RC | RC-012 |
| Permiso UI | Attendee autenticado (CTA login si invitado) |
| Pantallas | Tab `/wallet` |

## Quick path

1. Abrir tab Boletas.
2. Ver talones `valid` (y estados secundarios).
3. Tap → [FEAT-025](feat-025-ticket-qr.md). Si hay emisión sin `print_seen` → [FEAT-023](feat-023-ticket-print.md) primero.

## Pantallas

Cards compactas (~168px) en un riel **full-bleed** hasta el borde de la pantalla: **un card por evento**. Tap abre las boletas de ese evento ([FEAT-025](feat-025-ticket-qr.md)). Bajo el flyer: recuento `3 disponibles · 0 usadas` (y pendiente/cedida si aplica). Sin CTA Mostrar. Lead de la tab: el mismo recuento global. Pull-to-refresh.

| Estado ticket | Lista |
|---------------|-------|
| valid | Cuenta como **disponible** en el card del evento |
| reserved | Cuenta como **pendiente** |
| used | Cuenta como **usada**; el card se archiva (gris) solo si no queda ninguna disponible |
| transferred | Cuenta como **cedida** |
| cancelled | Ocultar |

## Flujo

`GET /v1/me/tickets`. Vacío autenticado: “Tu primer evento” + CTA Explorar. Invitado: Surface con CTA "Entrar" para login.

## Estados

Error: reintentar. Offline: mostrar último cache solo de metadatos; QR según 025.

## Contrato

Auth access. Cada item trae o permite fetch del ticket token.

## Fuera de alcance

Reventa marketplace. Apple Wallet pass (backlog). La animación de emisión (023).

## Checklist

- [ ] Tab Boletas visible sin sesión; CTA suave para login, no muro.
- [ ] Primera compra no salta la impresión.
- [ ] Used no parece válido.
- [ ] Un card por evento, compacto, riel al borde, recuento disponibles/usadas, tap abre las boletas.

## Relacionadas

[FEAT-001](feat-001-shell-navigation.md), [FEAT-023](feat-023-ticket-print.md), [FEAT-025](feat-025-ticket-qr.md), [FEAT-026](feat-026-ticket-transfer.md), [FEAT-040](feat-040-saved-tab.md)
