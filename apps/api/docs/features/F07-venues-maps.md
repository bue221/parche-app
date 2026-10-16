# F07 Venues y mapa

El backend guarda **dónde** es el parche (WGS84 + texto). No sirve tiles ni Google Maps. App y web pintan con MapLibre + OSM.

**Depends on:** F02, F06  
**Unlocks:** F08, F22, F25  
**Stories:** ubicación de evento, RC-003, RC-017 (bbox), RC-023 (clubes reusan venue)

## Quick path

1. Tabla `venues` con name, address_text, lat, lng, geojson opcional.
2. Evento referencia `venue_id` o embebe pin (F08).
3. Listados públicos devuelven lat/lng.
4. `GET /v1/events?min_lat&min_lng&max_lat&max_lng`.

## Datos

| Campo | Regla |
|-------|--------|
| `lat` `lng` | WGS84; obligatorio para `published` |
| `address_text` | libre, Bogotá-first |
| `geojson` | `Polygon` o `Point` opcional; validar GeoJSON |
| `source` | `user_pin` (default). No `google_places` |

Rango: lat [-90,90], lng [-180,180]. Publicar sin pin → `VALIDATION_ERROR`.

No hay geocoding en servidor. El cliente manda el pin. Opcional futuro Nominatim detrás del **mismo** contrato (el API no cambia).

## HTTP

### `POST /v1/venues`

Auth promoter. Body name, address_text, lat, lng, geojson?. 201. Queda en el tenant.

### `GET /v1/venues/{id}`

Público si algún evento published lo usa; si no, miembro tenant.

### `PATCH /v1/venues/{id}`

`event.write` equivalente: tenant owner/staff.

### `GET /v1/venues`

Query `q`, bbox. Públicos: los que tienen ≥1 evento published. Lista de clubes F25 filtra `kind=club`.

### Bbox en eventos (F22 también lista filtros; **el bbox se implementa aquí**)

`GET /v1/events?min_lat=&min_lng=&max_lat=&max_lng=`  
Rechazar bbox > ~2 grados de lado para no escanear el planeta (`VALIDATION_ERROR`). Índice GiST o filtro numérico.

## Clientes

- Expo/web: MapLibre GL, raster OSM o vector propio. **Prohibido** SDK Google Maps / Places / Mapbox como requisito.
- Deep link: detalle evento centra el pin.

## Errores

| Caso | code |
|------|------|
| Pin fuera de rango | `VALIDATION_ERROR` |
| Publish sin coords | `VALIDATION_ERROR` |
| Bbox invertido | `VALIDATION_ERROR` |

## Checklist

- [x] Evento published siempre trae lat/lng
- [x] Bbox filtra
- [x] GeoJSON se persiste y se valida
- [x] Cero dependencia Google en backend
- [x] Documentado en OpenAPI

## Next step

[F08](F08-events-lifecycle.md) pega el venue al evento. [F25](F25-clubs-directory.md) marca venues como clubes.
