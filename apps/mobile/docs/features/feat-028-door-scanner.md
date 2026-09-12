# FEAT-028: Scanner de puerta

El staff autentica con **su** access y envía el ticket token. Varios teléfonos a la vez; el doble uso lo resuelve el API (`SETNX`), no la UI.

| Campo | Valor |
|-------|-------|
| Sprint | 3 |
| RC | RC-013 |
| Permiso UI | `event.door.scan` |
| Pantallas | `DoorScanner` (inmersiva) |

## Quick path

1. Operar o detalle → Puerta → elige evento (si hay varios).
2. Cámara ([FEAT-036](feat-036-device-permissions.md)).
3. Lee QR → `POST /v1/events/{eventId}/check-in` body = ticket token.
4. Feedback a prueba de sol según código.

## Pantallas

Cámara full bleed + overlay B/N. Resultado a pantalla casi completa:

| Código | UI | Color |
|--------|-----|-------|
| `approved` | PASA | `confirm` |
| `duplicate` | YA USADO | chrome B/N, no verde |
| `invalid` | INVÁLIDO | B/N |
| `wrong_event` | OTRO EVENTO | B/N |
| `expired` | VENCIDO | B/N |
| `forbidden` | SIN PERMISO | salir a Operar |

Volver a apuntar tras ~1.5 s. No decidir approved en el cliente.

Aforo compacto en esquina: [FEAT-029](feat-029-door-live.md).

## Flujo

Access del scanner en header. Nunca el access del asistente. Varios devices; el primero `SETNX` gana.

Revocación: siguiente POST `forbidden` → cerrar cámara.

## Estados

Cámara denegada: copy + ajustes SO. Red: no marcar usado local. Cola de un scan a la vez (no ráfaga de 30 POST del mismo frame).

## Contrato

`POST /v1/events/{eventId}/check-in`. Rate limit posible.

## Fuera de alcance

Modo linterna como feature. Escanear sin login. Listado de nombres de compradores.

## Checklist

- [ ] Dos scanners, un QR: uno approved, otro duplicate.
- [ ] `metrics` no abre esta pantalla.
- [ ] `confirm` solo en approved.
- [ ] Event_id de la ruta = evento elegido.

## Relacionadas

[FEAT-025](feat-025-ticket-qr.md), [FEAT-029](feat-029-door-live.md), [FEAT-018](feat-018-event-members.md)
