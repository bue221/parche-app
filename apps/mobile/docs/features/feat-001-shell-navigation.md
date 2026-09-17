# FEAT-001: Shell y navegación

La app usa un chrome de producto: el asistente vive en Explorar (listado) y Mapa; Guardados muestra interés local o wallet; Cuenta nunca cambia de nombre; operación aparece según cuenta y membresía.

| Campo | Valor |
|-------|-------|
| Sprint | 1 (tabs base); 2–3 amplían visibilidad |
| RC | RC-016 (criterio de navegación fluida) |
| Permiso UI | Tabs condicionales, no un rol global |
| Pantallas | Tab bar + stacks modales |

## Quick path

1. Abrir la app autenticado o no.
2. Ver **Explorar**, **Mapa**, **Guardados** y **Cuenta** (mismos labels).
3. Si hay promoter o membresía activa: **Operar**, con badge si hay evento hoy o invitación pending.

## Pantallas

| Pieza | Contenido |
|-------|-----------|
| Tab Explorar | [FEAT-005](feat-005-agenda.md) (listado de fechas) |
| Tab Mapa | [FEAT-006](feat-006-explore-map.md) |
| Tab Guardados | [FEAT-040](feat-040-saved-tab.md); interés local + [FEAT-024](feat-024-ticket-wallet.md) |
| Tab Cuenta | [FEAT-012](feat-012-profile-me.md); label fijo |
| Tab bar | `TabBar` + `TabBarItem`: `bg-surface`, `shadow-tab`, aurora filled en activo, slate outline en idle |
| Stacks | Auth (modal), detalle evento/artista, checkout, impresión, scanner, invite |

## Flujo

- Invitado: Explorar + Mapa + Guardados (local) + Cuenta (CTA). Seguir/guardar no piden cuenta. Comprar abre checkout y el auth sheet.
- Tras login, el tab seleccionado se conserva si sigue existiendo. No redirigir a Operar solo por ser promoter.
- Acciones de un evento (editar, escanear, métricas) salen del **detalle** o de Operar, nunca de un “modo admin” global.

## Estados

| Estado | UI |
|--------|-----|
| Cargando membresías | Tabs públicas; Operar aparece al resolver |
| Sin membresías | Operar no existe |
| Revocación | Operar desaparece al refrescar; stacks de puerta se cierran |

## Contrato

`GET /v1/me`, `GET /v1/me/memberships`. No cachear permisos como verdad más de una sesión corta.

## Fuera de alcance

Drawer hamburguesa. Navegación de la web Next. Personalización de tabs por el usuario. Tabs distintas por perfil.

## Checklist

- [ ] Invitado ve Guardados (local) y Cuenta; no ve Operar.
- [ ] Staff de un solo evento ve Operar; no ve métricas de otros tenants.
- [ ] Chrome semántico (canvas + surface); tab bar `bg-surface` + `shadow-tab`; `aurora` filled en activo, slate en idle; `primary` inverso en CTAs.
- [ ] Parche logueado no se aplana a settings: sigue el home de perfil primario.

## Relacionadas

[FEAT-004](feat-004-auth-session.md), [FEAT-027](feat-027-operate-hub.md), [FEAT-035](feat-035-deep-links.md)
