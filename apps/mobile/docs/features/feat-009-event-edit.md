# FEAT-009: Editar evento

El staff con `event.write` actualiza un evento ya creado. Mismo wizard que crear, hidratado. No es transferir ownership ni borrar.

| Campo | Valor |
|-------|-------|
| Sprint | 1 |
| RC | RC-022 |
| Permiso UI | `event.write` |
| Pantallas | `EventEdit` (`EventWizard`) |

## Quick path

1. Mesa del evento (Operar) → editar.
2. Mismos 4 pasos: Fotos → Datos → Pin → Review.
3. `PATCH /v1/events/{id}` → mesa de ese evento.

## Pantallas

Idéntica a [FEAT-008](feat-008-event-create.md) con valores hidratados (flyer + galería). El flyer ya tiene `event_id`: el paso 1 sube al elegir. Quitar una foto extra llama `DELETE /v1/events/{id}/assets/{assetId}`. `owner` ve peligro (borrar) solo si el API lo permite más adelante; **MVP: no borrar**. `manager` no ve transferir ownership.

## Flujo

Carga detalle → edita por pasos → patch. Conflicto (`CONFLICT`): recargar y avisar. Tras guardar o enviar, vuelve a la mesa de ese evento (no al checklist de alta ni a la ficha pública).

## Estados

`FORBIDDEN`: salir a la mesa de ese evento. Evento aprobado: editar sigue permitido para copy/media **hasta que la noche termina**. Evento finalizado (`eventHasEnded`: `endsAt` o 12h tras `startsAt`): toast + redirect a la mesa. No se cambia flyer, pin ni copy para no alterar métricas ni ventas.

## Contrato

`PATCH /v1/events/{id}` + assets. Submit opcional si el estado lo permite.

## Fuera de alcance

Cambiar tenant. Editar ventas cerradas de etapas (eso es [FEAT-020](feat-020-ticket-types.md)).

## Checklist

- [ ] `door` no abre editar.
- [ ] Evento finalizado no abre el wizard; vuelve a la mesa.
- [ ] Pin, flyer y galería nuevos se ven en público tras refresh.
- [ ] Crear y editar comparten `EventWizard`, no un segundo diseño.

## Relacionadas

[FEAT-008](feat-008-event-create.md), [FEAT-007](feat-007-event-detail.md)
