# FEAT-012: Perfil personal

Parche es el home de identidad. La cuenta se nombra aquí, pero el cuerpo cambia según el perfil primario: promoter > artist > attendee. Los demás perfiles quedan como atajos.

| Campo | Valor |
|-------|-------|
| Sprint | 2 (campos); 1 puede mostrar email + salir |
| RC | RC-010 |
| Permiso UI | Access |
| Pantallas | Tab `Parche` → `Me` |

## Quick path

1. Abrir Parche.
2. Ver el home de tu perfil primario (no una lista plana de settings).
3. Editar nombre y avatar ([FEAT-010](feat-010-media-upload.md) kind `avatar`) en cuenta.
4. `PATCH /v1/me` → se refleja en comentarios futuros / transferencia.

## Pantallas

Header compacto compartido: avatar, nombre, chips localizados (Asistente / Artista / Organizador) con el animal del perfil. Chrome B/N; no hay color de chrome por perfil. El lockup **Parche** cambia el glifo de la marca (no el color): Tucán (asistente), Cóndor (artista), Jaguar (organizador). Invitado conserva la P.

| Primario | Mascota | Cuerpo |
|----------|---------|--------|
| Asistente | Tucán | Tiquetes → following → activar artista / atajo operar |
| Artista | Cóndor | Preview de vitrina + editar ficha → following → cuenta |
| Promoter | Jaguar | Tus fechas (`EventCard` listing) + crear → identidad |
| Puerta (membresía) | — | Atajo “Esta noche” si hay fecha próxima |
| Admin | — | Fila cola; no un skin |

Sin perfil `artist`: CTA “Activar ficha de artista” (`POST /v1/me/profiles/artist`) y luego [FEAT-013](feat-013-artist-edit.md). No mostrar “Perfil de artista” a quien no lo activó. Promoter crea fichas invitadas desde lineup, no desde Parche.

## Flujo

`GET /v1/me` al entrar. Invitado: tarjeta de valor + CTA que abre AuthSheet; apariencia (tema); label del tab siempre **Cuenta**. Con sesión: home del perfil primario (promoter > artist > attendee). Completar nombre/teléfono: [FEAT-041](feat-041-complete-profile.md).

## Estados

Error de patch: conservar valores anteriores. Error al activar artista: toast y se queda en Parche.

## Contrato

`GET /v1/me`, `PATCH /v1/me`, `POST /v1/me/profiles/artist`.

## Fuera de alcance

Cambiar email. Panel de todos los usuarios (RC-024). Tabs distintas por perfil.

## Checklist

- [ ] Avatar se ve en UI de transferencia destino cuando aplique.
- [ ] Logout desde esta pantalla.
- [ ] Sin sesión no hay edición.
- [ ] Asistente+artista+promoter ve home promoter con atajos.
- [ ] Chips nunca muestran el enum crudo (`attendee`).
- [ ] El lockup y el título de Parche muestran el animal del perfil primario; chips muestran el de cada perfil.

## Relacionadas

[FEAT-002](feat-002-auth-register.md), [FEAT-013](feat-013-artist-edit.md), [FEAT-027](feat-027-operate-hub.md)
