# FEAT-023: Impresión animada del tiquete

El tiquete **no aparece**: se **imprime**. Tras un pago `paid` (o la primera vez que hay `valid` sin haber visto la emisión), una impresora térmica de flyer empuja el papel, estampa datos y al final revela el QR. Es el momento de éxito de compra; el verde `confirm` solo cubre el flash de “listo”, no el chrome del ticket.

| Campo | Valor |
|-------|-------|
| Sprint | 3 |
| RC | RC-011, RC-012 (emisión + primer acceso al QR) |
| Permiso UI | Dueño de los tiquetes `valid` |
| Pantallas | `TicketPrint` (modal a pantalla completa, no tab) |

## Quick path

1. [FEAT-022](feat-022-order-return.md) resuelve `paid` **o** wallet detecta emisión no impresa.
2. Entra `TicketPrint` a oscuras/máquina: ranura, ruido visual de avance.
3. Sale un talón de **papel físico** (siempre tinta negra sobre `paper-white`, también en dark mode).
4. El QR se dibuja al final, línea a línea o por barrido.
5. El talón queda quieto → flash `confirm` breve → CTA “Ver en Tiquetes” ([FEAT-024](feat-024-ticket-wallet.md)).

## Pantallas

Una sola escena, tres zonas verticales:

| Zona | Qué es |
|------|--------|
| Máquina | Franja `pitch-black` con ranura. No es nav. |
| Papel | Ticket recortado, perforación superior, flyer dither B/N, tipografía Inter; nombre del evento puede usar Antonio solo si el tamaño de display cabe (~80px+). |
| Acciones | Tras terminar: outlined “Siguiente” / “Ir a Tiquetes”. “Saltar” visible pero discreto. |

Datos en el papel (mínimos, sin PII extra):

- Nombre del evento, fecha, venue
- Tipo de tiquete
- Orden corta / last 4 del id, no el UUID completo como secreto
- QR del **ticket token** (misma carga que [FEAT-025](feat-025-ticket-qr.md))

Varios tiquetes en una order: se imprimen **uno detrás de otro** (el papel se corta / sube y entra el siguiente). No un abanico imposible de leer.

## Flujo de animación (contrato de producto)

Orden fijo; no reordenar en implementación:

1. **Idle de máquina** (≤ 300 ms): ranura vacía.
2. **Feed**: el rectángulo de papel crece desde la ranura (máscara), con jitter leve de impresora, ~800–1400 ms según alto del talón.
3. **Stamp de flyer**: la imagen aparece como si el cabezal pasara (barrido horizontal o dither progresivo), no fade genérico.
4. **Tipo** (evento, fecha, tipo): líneas de texto se revelan de arriba abajo, ritmo de punto térmico.
5. **QR**: última pasada. Hasta que esta pasada termina, el código no es scaneable a propósito (placeholder en gris `muted` o líneas incompletas).
6. **Corte**: micro-pausa + perforación; papel ya no se mueve.
7. **Confirm**: overlay o banda `confirm` (~400 ms) + opcional haptic success. Copy: “Tiquete impreso”.
8. **Idle interactivo**: el talón se puede guardar visualmente; CTA habilitados.

Saltar: completa el estado “impreso” igual (el tiquete ya es `valid` en API) y va al wallet. No cancela la compra.

Replay: no se reimprime cada vez que abres el wallet. Replay opcional **una vez** desde el detalle del tiquete (“Ver impresión”) sin volver a pegar `confirm` de pago.

Flag local por `ticket_id` (o `order_id` si es el lote): `print_seen`. Si el usuario reinstaló la app, mostrar impresión de nuevo es aceptable; no es un secreto de seguridad.

Reducir movimiento (accesibilidad del SO): saltar a frame final (papel + QR completo) + `confirm` corto, sin feed.

## Relación con el token

La animación **no genera** la firma. El API ya emitió el ticket token al pasar a `valid`. La app solo revela en escena lo que `GET /v1/me/tickets` (o el payload de la order) ya trae.

Si el token aún no llegó (race post-webhook): la máquina se queda en “imprimiendo…” y no inventa un QR de `ticket_id` plano. Timeout → copy “El tiquete está en camino” + ir a wallet para pull-to-refresh.

## Estados

| Estado | UI |
|--------|-----|
| Esperando token | Máquina en feed lento; sin QR |
| Un tiquete | Un ciclo 1–8 |
| N tiquetes | Ciclos encadenados; contador “2 / 3” en la máquina (Inter caption), no en el papel |
| Error de fetch | Papel a medias no se presenta como válido; CTA reintentar |
| `used` / `transferred` | No se abre esta pantalla |
| Segundo paid de otra order | Nueva impresión para esos ids |

## Contrato

Lectura: `GET /v1/orders/{id}` y/o `GET /v1/me/tickets`. Cero POST de “print”. QR = JWS de tiquete, no access JWT, no UUID crudo.

## Fuera de alcance

- Impresora Bluetooth real / AirPrint (la metáfora es in-app).
- Animación en la web Next.
- Compartir video de la impresión.
- Estampar el access token.
- Verde en botones o en el papel (el papel es siempre blanco/negro; `confirm` es overlay de éxito).
- Fade/scale tipo modal genérico como único efecto.

## Checklist

- [ ] Primera visita post-pago: siempre esta pantalla, no el wallet directo.
- [ ] QR incompleto no se puede usar en puerta (no mostrar token hasta el paso 5–6).
- [ ] Papel no invierte colores en dark mode.
- [ ] N entradas = N impresiones consecutivas.
- [ ] Saltar marca `print_seen` y el tiquete sigue `valid`.
- [ ] Reduce Motion = estado final sin feed.
- [ ] Replay no duplica orders ni tokens.
- [ ] Tokens no van a logs ni crashlytics.

## Relacionadas

[FEAT-021](feat-021-ticket-purchase.md), [FEAT-022](feat-022-order-return.md), [FEAT-024](feat-024-ticket-wallet.md), [FEAT-025](feat-025-ticket-qr.md)
