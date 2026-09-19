# FEAT-028: Scanner de puerta

El staff autentica con **su** access y envía el ticket token. Varios teléfonos a la vez; el doble uso lo resuelve el API (`SETNX`), no la UI.

| Campo | Valor |
|-------|-------|
| Sprint | 3 |
| RC | RC-013 |
| Permiso UI | `event.door.scan` |
| Pantallas | `DoorScanner` (inmersiva) |

## Quick path

1. Operar → mesa del evento → Puerta. Si hay varios eventos, se elige en el hub.
2. Cámara ([FEAT-036](feat-036-device-permissions.md)).
3. Sostiene el QR ~0.5s (un frame suelto no cuenta) → overlay **Código leído**.
4. Staff confirma **Dar ingreso** → `POST /v1/events/{eventId}/check-in` body = ticket token. Cancelar vuelve a la cámara sin marcar.
5. Feedback a prueba de sol según código.

## Pantallas

Cámara full bleed + overlay B/N. Hold ~500ms → overlay papel **Código leído** (Dar ingreso / Cancelar). El POST no sale hasta confirmar. Resultado a pantalla casi completa:

| Código | UI | Color |
|--------|-----|-------|
| `approved` | PASA | `confirm` (volt) |
| `duplicate` | YA USADO | `amber` |
| `invalid` | INVÁLIDO | `danger` |
| `wrong_event` | OTRO EVENTO | `danger` |
| `expired` | VENCIDO | `danger` |
| `forbidden` | SIN PERMISO | `danger`; salir a Operar |

El resultado se queda a pantalla completa hasta **Continuar**. No decidir approved en el cliente.

Aforo compacto en esquina: [FEAT-029](feat-029-door-live.md).

## Flujo

Access del scanner en header. Nunca el access del asistente. Varios devices; el primero `SETNX` gana.

Revocación: siguiente POST `forbidden` → cerrar cámara.

## Estados

Cámara denegada: copy + ajustes SO. Red: no marcar usado local. El mismo código debe sostenerse ~500ms antes de bloquear; un frame accidental no abre confirmación. Cola de un scan a la vez (no ráfaga de 30 POST del mismo frame). El POST sale solo tras **Dar ingreso**; Cancelar no llama al API.

Evento finalizado: no monta la cámara. Deep link de Puerta → Aforo si hay `event.door.live`, si no la mesa. Check-in mock responde `expired`.

## Contrato

`POST /v1/events/{eventId}/check-in`. Rate limit posible.

## Fuera de alcance

Modo linterna como feature. Escanear sin login. Listado de nombres de compradores.

## Checklist

- [ ] Dos scanners, un QR: uno approved, otro duplicate.
- [ ] `metrics` no abre esta pantalla.
- [ ] `confirm` solo en approved.
- [ ] Event_id de la ruta = evento elegido.
- [ ] Un destello de QR no dispara POST; hace falta hold + Dar ingreso.
- [ ] Evento finalizado no abre el scanner.

## Relacionadas

[FEAT-025](feat-025-ticket-qr.md), [FEAT-029](feat-029-door-live.md), [FEAT-018](feat-018-event-members.md)
