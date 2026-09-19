# FEAT-015: Artistas del evento

El organizer vincula artistas al evento. El asistente los ve ordenados en el detalle.

| Campo | Valor |
|-------|-------|
| Sprint | 2 |
| RC | RC-007 |
| Permiso UI | Escribir: `event.write`. Leer: público en detalle |
| Pantallas | Bloque en `EventDetail` + `EventLineupEdit` |

## Quick path

1. Staff → editar artistas.
2. Buscar/añadir artista; ordenar.
3. Público ve la lista en el detalle; tap → [FEAT-014](feat-014-artist-public.md).

## Pantallas

Editor: lista reordenable. Vacío staff: “Aún no hay artistas”. Vacío público: se oculta el bloque. Título de pantalla y del bloque: **Artistas**. Evento finalizado: lista en consulta, sin añadir ni quitar.

## Flujo

`POST /v1/events/{id}/artists`, `DELETE /v1/events/{id}/artists/{artistId}`.

## Estados

Artista duplicado: `CONFLICT` / no añadir dos veces.

## Contrato

Permiso `event.write`.

## Fuera de alcance

Horarios por slot (headliner vs open) más allá de un orden simple. Booking payments.

## Checklist

- [ ] `door` no edita artistas.
- [ ] Orden se respeta en detalle.
- [ ] Quitar artista no borra su perfil global.
- [ ] Evento finalizado no cambia el cartel.

## Relacionadas

[FEAT-007](feat-007-event-detail.md), [FEAT-013](feat-013-artist-edit.md)
