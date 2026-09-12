# FEAT-002: Registro

Un usuario nuevo crea cuenta como asistente u organizador para entrar al resto de la app. El perfil inicial no lo convierte en staff de ningún evento.

| Campo | Valor |
|-------|-------|
| Sprint | 1 |
| RC | RC-001 |
| Permiso UI | Público |
| Pantallas | `Register` |

## Quick path

1. Parche → crear cuenta.
2. Email, contraseña, nombre; elegir `attendee` o `promoter`.
3. Éxito → sesión iniciada ([FEAT-004](feat-004-auth-session.md)) → Agenda.

## Pantallas

| Elemento | Regla |
|----------|-------|
| Perfil inicial | Un control: Asistente / Organizador. Artista se activa en [FEAT-013](feat-013-artist-edit.md). |
| Errores | Mensaje genérico si el email ya existe (mismo tono que login). |
| Legal | Texto corto de cuenta; sin modal legal largo en MVP. |

## Flujo

`POST /v1/auth/register` → guardar refresh seguro + access en memoria → `GET /v1/me`.

## Estados

| Estado | UI |
|--------|-----|
| Envío | CTA deshabilitado; no doble submit |
| `VALIDATION_ERROR` | Campos marcados |
| Red | Reintentar; no borrar el formulario |

## Contrato

`POST /v1/auth/register`. Body: email, password, display name, `initial_profile`.

## Fuera de alcance

OAuth. Verificación de email. Reset ([backlog RC-021](../product/prd.md)).

## Checklist

- [ ] Asistente no ve crear evento.
- [ ] Promoter llega a crear evento ([FEAT-008](feat-008-event-create.md)).
- [ ] No se revela si el email ya está registrado.

## Relacionadas

[FEAT-003](feat-003-auth-login.md), [FEAT-004](feat-004-auth-session.md)
