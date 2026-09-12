# FEAT-011: Pin de mapa (publicación)

El promoter suelta el pin donde ocurre la fiesta. Esa coordenada es la de Explorar y del detalle. El GPS del teléfono es atajo, no requisito.

| Campo | Valor |
|-------|-------|
| Sprint | 1 |
| RC | RC-003 |
| Permiso UI | `event.write` |
| Pantallas | Bloque mapa en crear/editar |

## Quick path

1. Mapa OSM en el formulario.
2. Long-press o arrastrar pin.
3. Guardar `lat`/`lng` WGS84 con el evento.

## Pantallas

Mapa compacto + `venue_name` + `address_text` (lectura humana, no geocode obligatorio). Botón “usar mi ubicación” pide permiso ([FEAT-036](feat-036-device-permissions.md)) y mueve el pin; si niega, el mapa sigue usable.

Geocoding Nominatim/Photon: opcional, nunca Google Places.

## Flujo

Publicar bloqueado si faltan coords. Borrador puede guardarse sin pin.

## Estados

Mapa no carga teselas: aviso + campos lat/lng de respaldo no son el camino feliz (evitar lat manual salvo fallback).

## Contrato

Campos `lat`, `lng`, `venue_name`, `address_text` en create/patch.

## Fuera de alcance

GeoJSON de contorno. Indoor maps.

## Checklist

- [ ] Sin Google Maps.
- [ ] Pin publicado = mismo punto en Explorar.
- [ ] Ubicación denegada no impide publicar.

## Relacionadas

[FEAT-006](feat-006-explore-map.md), [FEAT-008](feat-008-event-create.md)
