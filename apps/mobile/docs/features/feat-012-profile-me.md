# FEAT-012: Perfil personal

Parche es el home de identidad. La cuenta se nombra aquí, pero el cuerpo cambia según el perfil primario: promoter > artist > attendee. Los demás perfiles quedan como atajos.

| Campo | Valor |
|-------|-------|
| Sprint | 2 (campos); 1 puede mostrar email + salir |
| RC | RC-010 |
| Permiso UI | Access |
| Pantallas | Tab `Parche` → `Me`; `/parche/editar`; `/parche/siguiendo` |

## Quick path

1. Abrir Parche.
2. Ver el home de tu perfil primario (no una lista plana de settings).
3. Editar nombre y avatar en `/parche/editar` ([FEAT-010](feat-010-media-upload.md) kind `avatar`).
4. `PATCH /v1/me` → se refleja en comentarios futuros / transferencia.

## Pantallas

Header **Parche** + mascota del perfil primario (Tucán / Cóndor / Jaguar) y toggle de apariencia a la derecha. Chrome B/N; no hay color de chrome por perfil. Invitado no lleva animal.

El cuerpo logueado no es un listado plano: tarjeta de identidad, dos atajos y un CTA, luego filas de cuenta.

| Pieza | Contenido |
|-------|-----------|
| Identidad | Avatar circular + spark aurora, nombre, label del primario (Asistente / Artista / Organizador). Stats: Tiquetes, Siguiendo, Fechas |
| Atajo 1 | Cambia con el primario: Tiquetes → wallet; Tu vitrina → editar ficha; Tus fechas → Operar |
| Atajo 2 | Siguiendo → `/parche/siguiendo` |
| CTA | Una sola: Esta noche (puerta) > activar artista > primera fecha > completar perfil |
| Cuenta | Editar perfil (`/parche/editar`), apariencia, ver perfil público si hay ficha, Operar / crear / cola, cerrar sesión |

| Primario | Mascota | Atajo 1 |
|----------|---------|---------|
| Asistente | Tucán | Tiquetes |
| Artista | Cóndor | Tu vitrina |
| Promoter | Jaguar | Tus fechas |
| Puerta (membresía) | — | CTA “Esta noche” si hay fecha próxima |
| Admin | — | Fila cola; no un skin |

Sin perfil `artist`: CTA “Activa tu ficha de artista” (`POST /v1/me/profiles/artist`) y luego [FEAT-013](feat-013-artist-edit.md). No mostrar “Ver perfil” a quien no lo activó. Promoter crea fichas invitadas desde lineup, no desde Parche. Las fechas en sí viven en [FEAT-027](feat-027-operate-hub.md); Parche solo apila flyers en el atajo.

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
- [ ] El lockup y el título de Parche muestran el animal del perfil primario; el label de identidad nunca usa el enum crudo.

## Relacionadas

[FEAT-002](feat-002-auth-register.md), [FEAT-013](feat-013-artist-edit.md), [FEAT-027](feat-027-operate-hub.md)
