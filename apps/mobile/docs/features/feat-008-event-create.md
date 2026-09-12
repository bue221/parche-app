# FEAT-008: Crear evento

El promoter arma una fecha en un wizard flyer-first. Sin pin ni flyer no hay enviar a revisión.

| Campo | Valor |
|-------|-------|
| Sprint | 1 |
| RC | RC-003 |
| Permiso UI | Perfil `promoter` + tenant |
| Pantallas | `EventCreate` (`EventWizard`) |

## Quick path

1. Operar o CTA Agenda (solo promoter) → crear.
2. Flyer (preview 4:5) → Datos → Pin → Review con `EventCard` listing.
3. Guardar borrador abre el checklist de listing. Enviar a revisión abre el detalle.

## Pantallas

Wizard de 4 pasos (`N de 4`) y CTA sticky. No es un formulario largo.

| Paso | Qué pide | Persistencia |
|------|----------|----------------|
| 1 Flyer | Imagen local, preview inmediato | En crear vive en dispositivo hasta Datos |
| 2 Datos | Nombre, fecha/hora, venue, dirección, copy, género | Local en crear; `PATCH` en editar |
| 3 Pin | Mapa OSM (spec 011). El API exige pin o venue para crear. | `POST /v1/events` (draft) + upload flyer; luego `PATCH` pin en editar |
| 4 Review | `EventCard` listing | Borrador o `submit` |

El API exige `title` + `starts_at` + `ends_at` **y** pin o venue al crear: el flyer y los datos viven en local hasta confirmar el pin.

Tras el borrador: checklist Flyer / Pin / Tipos / Lineup. Equipo es opcional y no bloquea.

## Flujo

`POST /v1/events` al confirmar el pin → ids → upload asociado al `event_id`. Publicar exige `lat`/`lng` + flyer principal.

## Estados

Validación por paso, no al final del scroll. Fallo de upload: se conserva el preview local; no se permite enviar a revisión. Saving deshabilita el CTA (“Guardando…”).

## Contrato

`POST /v1/events`, upload flyer, `PATCH` pin, `POST /v1/events/{id}/submit`. Perfil promoter. Tenant implícito de `me`.

## Fuera de alcance

Duplicar evento. Rediseñar tipos / lineup por dentro (el checklist solo navega).

## Checklist

- [ ] Asistente no entra a esta pantalla.
- [ ] Publicar sin pin o sin flyer está bloqueado en Review.
- [ ] El flyer se elige y se ve antes de crear el draft.
- [ ] Tras borrador, el checklist apunta a tipos y lineup.

## Relacionadas

[FEAT-009](feat-009-event-edit.md), [FEAT-010](feat-010-media-upload.md), [FEAT-011](feat-011-map-pin.md), [FEAT-027](feat-027-operate-hub.md)
