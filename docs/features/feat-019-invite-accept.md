# FEAT-019: Aceptar invitación

El invitado entra con **su** cuenta y acepta el rol. Así la auditoría de scans tiene `scanner_user_id` real.

| Campo | Valor |
|-------|-------|
| Sprint | 2 |
| RC | — |
| Permiso UI | Access (registro si hace falta) |
| Pantallas | `InviteAccept` (deep link) |

## Quick path

1. Abrir link `/invites/{token}` ([FEAT-035](feat-035-deep-links.md)).
2. Si no hay sesión: login/registro y volver al token.
3. `POST /v1/invites/{token}/accept` → Operar muestra el evento.

## Pantallas

Nombre del evento + rol ofrecido (door/manager/metrics). CTA Aceptar. Rechazar = ignorar el link (sin endpoint extra en MVP).

## Flujo

Token inválido/revocado: “Esta invitación ya no vale”. Ya miembro: ir al evento.

## Estados

Rol `door` explica que verá scanner, no caja.

## Contrato

`POST /v1/invites/{token}/accept` con Bearer.

## Fuera de alcance

Aceptar sin cuenta. Unificar varias invitaciones en lote.

## Checklist

- [ ] Dos personas, dos cuentas, mismo evento.
- [ ] Tras aceptar, tab Operar aparece ([FEAT-001](feat-001-shell-navigation.md)).
- [ ] No se comparte contraseña del promoter.

## Relacionadas

[FEAT-018](feat-018-event-members.md), [FEAT-035](feat-035-deep-links.md)
