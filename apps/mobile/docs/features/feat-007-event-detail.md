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

En compacto el flyer es **flush** y **fijo**. La hoja `surface` (radio superior `navelements`) se superpone al arte y es lo único que scrollea: sube hasta pegar con el chrome (Volver / compartir / guardar), sin hueco, y conserva el redondeado al dockar. Sobre el arte va una viñeta oscura (blur suave + scrim `pitch-black`) que se disuelve hacia la foto. Círculos `paper-white` sobre la foto: Volver, Compartir, corazón Guardar. Tocar el arte abre un visor a pantalla completa (`contain`, fondo `pitch-black`, contador `N de M`). Si hay más de una foto, pill **N fotos** sobre el flyer y riel **Fotos** en la hoja. Si hay tracks, pill **Escuchar** en el flyer. El copy vive en esa hoja: género aurora, título Inter, cards Cuándo/Dónde, avatares de artistas, sobre el evento (Leer más), dirección + Ver en mapa, pin, audio, etapas como cards de precio, CTA sticky **Comprar boletas**. No hay listado público de asistentes ni contacto de organizer; el stack social es el cartel real. Compartir usa el sheet del OS o copia el link en web.

En **web desktop** la ficha copia el sitio de marketing: poster 4:5 a la izquierda (tag de género glass, miniaturas debajo) y copy a la derecha. Badge **Boletas a la venta**, título Inter grande, tres cards Cuándo / Dónde / Edad, **Cómo llegar** si hay pin, panel de boletas con etapas, sobre el evento, artistas y audio. Abajo, **Sigue el parche** (hasta 4 cards listing). La barra sticky es **Desde $X** + “Pago en la app. El QR queda en tu wallet.” + Comprar, a ancho de página. Guardar y compartir van junto al badge. El mapa embebido queda en compacto.

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
- [ ] En desktop web la ficha muestra poster 4:5, tres facts y barra sticky Comprar.
- [ ] Evento finalizado muestra CTA Finalizado, no Comprar.

## Relacionadas

[FEAT-021](feat-021-ticket-purchase.md), [FEAT-027](feat-027-operate-hub.md)
