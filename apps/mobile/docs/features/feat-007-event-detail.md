# FEAT-007: Detalle de evento

Una sola pantalla cuenta el evento **para el público**: flyer a sangre con chrome overlay, hoja de copy Inter, artistas, mapa del pin, audio y CTA sticky de compra. Si hay galería, el flyer y las miniaturas se tocan y se abren a pantalla completa. Operar ese evento es otra pantalla ([FEAT-027](feat-027-operate-hub.md)).

| Campo | Valor |
|-------|-------|
| Sprint | 1; 2–3 añaden bloques |
| RC | RC-005 |
| Permiso UI | Público + CTAs gated |
| Pantallas | `EventDetail` |

## Quick path

1. Entrar desde Explorar, mapa o deep link.
2. Ver foto, fecha, venue, descripción, pin. Tocar el flyer o una miniatura abre las fotos a sangre (swipe si hay más de una).
3. CTA sticky: Comprar si hay etapas a la venta (abre checkout, auth sheet si hace falta); **Finalizado** (disabled) si la noche ya pasó; Guardar evento sin cuenta. Artistas: Seguir local.
4. Si el user es staff de ese evento: CTA outline “Operar este evento” → mesa, no Editar/Más mezclados con comprar.

## Pantallas

En compacto el flyer es **flush** (bajo el notch). Círculos `paper-white` sobre la foto: Volver, Compartir, corazón Guardar. Tocar el arte abre un visor a pantalla completa (`contain`, fondo `pitch-black`, contador `N de M`). Si hay más de una foto, pill **N fotos** sobre el flyer y riel **Fotos** en la hoja. Si hay tracks, pill **Escuchar** en el flyer. El copy vive en una hoja `surface` con radio superior que se superpone al arte: género aurora, título Inter, venue + hora, avatares de artistas, sobre el evento (Leer más), dirección + Ver en mapa, pin, audio, etapas, CTA sticky. No hay listado público de asistentes ni contacto de organizer; el stack social es el cartel real. Compartir usa el sheet del OS o copia el link en web.

| Bloque | Sprint | Spec |
|--------|--------|------|
| Flyer + datos | 1 | este |
| Mapa del pin (solo lectura) | 1 | coords API |
| Artistas | 2 | [FEAT-015](feat-015-event-lineup.md) |
| Tracks | 2 | [FEAT-017](feat-017-event-tracks.md) |
| Comprar | 3 | [FEAT-021](feat-021-ticket-purchase.md) |
| Estado publicación | 3 | [FEAT-031](feat-031-admin-approval.md) |

CTAs nunca mezclan “escanear” y “comprar” en el mismo botón. Editar, puerta, etapas, equipo y métricas viven en la mesa de [FEAT-027](feat-027-operate-hub.md). Evento finalizado: ficha pública sigue visible; no se compra.

## Flujo

`GET /v1/events/{id}`. 404/GONE: pantalla “Este evento ya no está”.

## Estados

Borrador/en revisión: solo staff del evento. Público: cualquiera.

## Contrato

Auth opcional. Acciones extra fallan `FORBIDDEN` y se ocultan.

## Fuera de alcance

Editor inline de todo el evento (usa [FEAT-009](feat-009-event-edit.md)). Scanner embebido (pantalla propia). Mesa de operación (usa [FEAT-027](feat-027-operate-hub.md)).

## Checklist

- [ ] Invitado lee el detalle.
- [ ] Tocar flyer o galería abre el visor; swipe cambia de foto.
- [ ] `door` no ve ingresos en esta ficha; entra a la mesa y de ahí al scanner.
- [ ] Pin coincide con Mapa.
- [ ] Staff no ve Editar/Más sobre la ficha de compra.
- [ ] Evento finalizado muestra CTA Finalizado, no Comprar.

## Relacionadas

[FEAT-021](feat-021-ticket-purchase.md), [FEAT-027](feat-027-operate-hub.md)
