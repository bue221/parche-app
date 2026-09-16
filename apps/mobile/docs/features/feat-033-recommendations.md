# FEAT-033: Recomendaciones

Sugerencias para el asistente autenticado. Si no hay señales, se dice; no se inventa un ranking falso.

| Campo | Valor |
|-------|-------|
| Sprint | 4 |
| RC | RC-018 |
| Permiso UI | Attendee |
| Pantallas | Bloque en Explorar |

## Quick path

1. Explorar autenticada pide `GET /v1/me/recommendations`.
2. Muestra cards (mismo componente que Explorar).
3. Tap → detalle.

## Pantallas

Título “Para ti”. Vacío: ocultar bloque o “Sigue artistas para ver sugerencias”.

Invitado: no hay bloque (no hay `me`).

## Flujo

Fallo de API: ocultar, no romper Explorar.

## Estados

Sin follows ni compras: vacío honesto.

## Contrato

`GET /v1/me/recommendations`.

## Fuera de alcance

Entrenar el modelo en el teléfono. Explicabilidad larga.

## Checklist

- [ ] Explorar completa sigue debajo.
- [ ] Invitado no ve recomendaciones vacías raras.

## Relacionadas

[FEAT-005](feat-005-agenda.md), [FEAT-016](feat-016-artist-follow.md)
