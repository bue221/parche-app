# FEAT-032: Búsqueda y filtros

El asistente recorta la agenda por fecha, subgénero, DJ y texto. El mapa puede recortar por bbox.

| Campo | Valor |
|-------|-------|
| Sprint | 4 |
| RC | RC-017 |
| Permiso UI | Público |
| Pantallas | Sheet de filtros en Agenda y Explorar |

## Quick path

1. Abrir filtros.
2. Aplicar `from`, `to`, `genre`, `artist_id`, `q`.
3. Lista/mapa se actualizan. Limpiar = query base.

## Pantallas

SearchBar + chips en Agenda. Pantalla compacta de filtros con CTA fijo. Sin color de acento. Bbox: al soltar el mapa en Explorar (debounce).

## Flujo

Mismos params que `GET /v1/events`. Cursor se resetea al cambiar filtros.

## Estados

Cero resultados: “Nada en esos filtros” + limpiar.

## Contrato

Query string del PRD backend.

## Fuera de alcance

Filtro por clubes (RC-023). ML.

## Checklist

- [ ] Filtros de Agenda y mapa no divergen en params.
- [ ] Cambiar filtro no concatena páginas viejas.

## Relacionadas

[FEAT-005](feat-005-agenda.md), [FEAT-006](feat-006-explore-map.md)
