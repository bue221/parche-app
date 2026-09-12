# FEAT-025: Mostrar QR

En la puerta el asistente enseña el token firmado a pantalla completa, brillo alto. No es el access JWT.

| Campo | Valor |
|-------|-------|
| Sprint | 3 |
| RC | RC-012 |
| Permiso UI | Dueño; ticket `valid` |
| Pantallas | `TicketQR` |

## Quick path

1. Desde wallet (impresión ya vista).
2. Pantalla completa: QR + evento + tipo.
3. Staff escanea con [FEAT-028](feat-028-door-scanner.md).

## Pantallas

Papel/contraste máximo. Botón transferir (026). Brillo: subir al entrar, restaurar al salir (si el SO lo permite).

`used`: QR atenuado + “Ya ingresaste”. `transferred`: no mostrar código vivo.

## Flujo

El payload del QR es el ticket token (`tid`, `eid`, `jti`, `exp`). Transferencia invalida `jti` anterior: refetch.

Offline corto: si el token ya está en dispositivo y no expiró, se muestra; la validez real la decide la puerta.

## Estados

Token no listo: no pintar UUID. Expirado: copy + refresh.

## Contrato

Misma familia criptográfica que backend `TICKET_SIGNING_KEY`. Distinta de sesión.

## Fuera de alcance

Screenshot detection como garantía. Animación de impresión (solo replay desde aquí si se especifica en 023).

## Checklist

- [ ] QR ≠ access token.
- [ ] Tras transfer, el emisor no abre código válido.
- [ ] Brillo no se queda máximo al salir.

## Relacionadas

[FEAT-023](feat-023-ticket-print.md), [FEAT-028](feat-028-door-scanner.md)
