# FEAT-008: Crear evento

El promoter arma un evento en un wizard flyer-first. Sin pin ni flyer no hay enviar a revisión.

| Campo | Valor |
|-------|-------|
| Sprint | 1 |
| RC | RC-003 |
| Permiso UI | Perfil `promoter` + tenant |
| Pantallas | `EventCreate` (`EventWizard`) |

## Quick path

1. Operar, Explorar o Parche → crear. Si el organizer no tiene Mercado Pago, la pantalla o el modal piden conectar la cuenta (marca MP + CTA Conectar) antes del wizard.
2. Flyer (preview 4:5) y fotos extra → Datos → Pin → Review con `EventCard` listing.
3. Guardar borrador abre el checklist de listing. Enviar a revisión abre la mesa de ese evento.

## Pantallas

Wizard de 4 pasos (`N de 4`) y CTA sticky. No es un formulario largo.

| Paso | Qué pide | Persistencia |
|------|----------|----------------|
| 1 Fotos | Flyer 4:5 (obligatorio) + galería opcional (hasta 8) | En crear vive en dispositivo hasta el pin; en editar sube al elegir |
| 2 Datos | Nombre, fecha/hora, venue, dirección, copy, género | Local en crear; `PATCH` en editar |
| 3 Pin | Mapa OSM (spec 011). El API exige pin o venue para crear. | `POST /v1/events` (draft) + upload flyer y galería |
| 4 Review | `EventCard` listing | Borrador o `submit` |

El API exige `title` + `starts_at` + `ends_at` **y** pin o venue al crear: el flyer y los datos viven en local hasta confirmar el pin.

Tras el borrador: checklist Flyer / Pin / Etapas / Artistas. Equipo es opcional y no bloquea.

El paso 1 muestra el flyer como portada y un riel **Más fotos**. Sin `event_id` las extras quedan locales; al confirmar el pin se suben `kind: gallery`. Un flyer nuevo deja el anterior en galería (el API lo mueve).

## Flujo

`POST /v1/events` al confirmar el pin → ids → upload flyer y galería asociados al `event_id`. Publicar exige `lat`/`lng` + flyer principal. Un asistente se vuelve organizer en `/parche/cobros` (`POST /v1/me/profiles/promoter`) y conecta Mercado Pago ahí. Con `PAYMENT_PROVIDER=mercadopago` y OAuth activo, `POST /v1/events` responde 409 hasta conectar cobros.

## Estados

Validación por paso, no al final del scroll. Fallo de upload: se conserva el preview local; no se permite enviar a revisión. Saving deshabilita el CTA (“Guardando…”).

## Contrato

`POST /v1/events`, upload flyer/gallery, `PATCH` pin, `POST /v1/events/{id}/submit`. Perfil promoter. Tenant implícito de `me`.

## Fuera de alcance

Duplicar evento. Rediseñar etapas / artistas por dentro (el checklist solo navega).

## Checklist

- [ ] Asistente no entra a esta pantalla.
- [ ] Publicar sin pin o sin flyer está bloqueado en Review.
- [ ] El flyer se elige y se ve antes de crear el draft.
- [ ] Las fotos extra se eligen en el paso 1 y aparecen en el detalle tras el borrador.
- [ ] El wizard no abre si falta Mercado Pago (modal de cobro).

## Relacionadas

[FEAT-009](feat-009-event-edit.md), [FEAT-010](feat-010-media-upload.md), [FEAT-011](feat-011-map-pin.md), [FEAT-027](feat-027-operate-hub.md)
