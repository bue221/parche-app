# FEAT-009: Editar evento

El staff con `event.write` actualiza una fecha ya creada. Mismo wizard que crear, hidratado. No es transferir ownership ni borrar.

| Campo | Valor |
|-------|-------|
| Sprint | 1 |
| RC | RC-022 |
| Permiso UI | `event.write` |
| Pantallas | `EventEdit` (`EventWizard`) |

## Quick path

1. Detalle o Operar → editar.
2. Mismos 4 pasos: Flyer → Datos → Pin → Review.
3. `PATCH /v1/events/{id}` → detalle actualizado.

## Pantallas

Idéntica a [FEAT-008](feat-008-event-create.md) con valores hidratados. El flyer ya tiene `event_id`: el paso 1 sube al elegir. `owner` ve peligro (borrar) solo si el API lo permite más adelante; **MVP: no borrar**. `manager` no ve transferir ownership.

## Flujo

Carga detalle → edita por pasos → patch. Conflicto (`CONFLICT`): recargar y avisar. Tras guardar o enviar, vuelve al detalle (no al checklist de alta).

## Estados

`FORBIDDEN`: salir al detalle. Evento aprobado: editar sigue permitido para copy/media salvo reglas de admin futuras.

## Contrato

`PATCH /v1/events/{id}` + assets. Submit opcional si el estado lo permite.

## Fuera de alcance

Cambiar tenant. Editar ventas cerradas de tipos (eso es [FEAT-020](feat-020-ticket-types.md)).

## Checklist

- [ ] `door` no abre editar.
- [ ] Pin y flyer nuevos se ven en público tras refresh.
- [ ] Crear y editar comparten `EventWizard`, no un segundo diseño.

## Relacionadas

[FEAT-008](feat-008-event-create.md), [FEAT-007](feat-007-event-detail.md)
