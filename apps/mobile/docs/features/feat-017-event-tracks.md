# FEAT-017: Tracks de audio del evento

El evento puede llevar un preview corto de referencia. No es un streaming service.

| Campo | Valor |
|-------|-------|
| Sprint | 2 |
| RC | (media Sprint 2; no hay RC propio) |
| Permiso UI | Escribir `event.write`; reproducir: público del detalle |
| Pantallas | Bloque player en detalle; editor de tracks |

## Quick path

1. Staff sube audio ([FEAT-010](feat-010-media-upload.md) kind `audio`).
2. `PUT /v1/events/{id}/tracks` con orden y títulos.
3. Asistente reproduce en el detalle (URL corta o path autenticado).

## Pantallas

Player mínimo: play/pause, título. Un track a la vez. Chrome B/N; no visualizer de colores.

## Flujo

Hotlink prohibido: no copiar URL eterna a share sheet. Al expirar la URL, refetch.

## Estados

Sin tracks: bloque oculto al público. Error de carga: “No se pudo reproducir”.

## Contrato

`PUT /v1/events/{id}/tracks`. Límite 20 MB preview.

## Fuera de alcance

Transcoding, waveforms complejas, DJ sets de 2 h.

## Checklist

- [ ] Play no abre Safari/Chrome externo como camino feliz.
- [ ] `door` no edita tracks.
- [ ] Upload sigue presign.

## Relacionadas

[FEAT-007](feat-007-event-detail.md), [FEAT-010](feat-010-media-upload.md)
