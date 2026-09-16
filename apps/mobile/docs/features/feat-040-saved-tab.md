# FEAT-040: Tab Guardados

La tercera tab se llama **Guardados** siempre. Dentro hay dos segmentos: fechas/artistas guardados y boletas. El invitado no choca con un empty de login.

| Campo | Valor |
|-------|-------|
| Sprint | 4 |
| RC | RC-012, RC-016 |
| Permiso UI | Público + wallet con access |
| Pantallas | Tab `/tickets` |

## Quick path

1. Invitado abre Guardados: ve follows y eventos locales.
2. Segmento Boletas: CTA suave para entrar, no bloqueo.
3. Logueado: Guardados mezcla API + local; Boletas es [FEAT-024](feat-024-ticket-wallet.md).

## Pantallas

Segmented control `Guardados` | `Boletas`. Default invitado = Guardados. Impresión pendiente sigue redirigiendo desde Boletas autenticada.

## Flujo

Label del tab no muta con la sesión. Ruta file-based sigue `/tickets`.

## Contrato

[FEAT-037](feat-037-local-interest.md) + `GET /v1/me/tickets`.

## Fuera de alcance

Renombrar el archivo de ruta. Tabs distintas por perfil.

## Checklist

- [ ] Invitado no ve solo “Inicia sesión para ver tus tiquetes”.
- [ ] Label fijo Guardados.

## Relacionadas

[FEAT-001](feat-001-shell-navigation.md), [FEAT-024](feat-024-ticket-wallet.md)
