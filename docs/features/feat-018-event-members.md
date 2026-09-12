# FEAT-018: Miembros del evento

Varias personas operan la misma noche. El owner/manager invita por rol; nadie comparte un login de “la puerta”.

| Campo | Valor |
|-------|-------|
| Sprint | 2 |
| RC | (decisión de repo; no RC académico) |
| Permiso UI | `event.members.manage` o `owner` |
| Pantallas | `EventMembers` |

## Quick path

1. Operar → evento → equipo.
2. Invitar email o user + rol `manager` | `door` | `metrics`.
3. Lista: pending / active / revoked.

## Pantallas

| Rol a asignar | Qué podrá hacer |
|---------------|-----------------|
| `manager` | Editar, métricas, invitar door |
| `door` | Scan + aforo |
| `metrics` | Solo dashboard |

No se invita `owner` por este formulario (ownership no se transfiere en MVP).

Revocar: confirmación. El miembro pierde UI de puerta/métricas al fallar el API aunque su JWT viva.

## Flujo

`GET/POST/PATCH/DELETE /v1/events/{id}/members`.

## Estados

Vacío: “Invita a quien cubre la puerta”. `FORBIDDEN` si solo eres `door`.

## Contrato

Estados de fila `pending` | `active` | `revoked`.

## Fuera de alcance

Un usuario/contraseña compartido. Permisos custom por checkbox (se usan roles paquete).

## Checklist

- [ ] Dos `door` pueden existir a la vez.
- [ ] `door` no ve esta lista de gestión.
- [ ] Revocar no espera a que expire el access.

## Relacionadas

[FEAT-019](feat-019-invite-accept.md), [FEAT-028](feat-028-door-scanner.md)
