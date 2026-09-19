# FEAT-001: Shell y navegación

La app usa un chrome de producto: Explorar combina listado y mapa (estilo Airbnb) con FAB toggle; Favoritos es un tablero de colecciones (recientes, ciudad/año, artistas); Boletas muestra los QRs; Cuenta nunca cambia de nombre; operación aparece según cuenta y membresía.

| Campo | Valor |
|-------|-------|
| Sprint | 1 (tabs base); 2–3 amplían visibilidad |
| RC | RC-016 (criterio de navegación fluida) |
| Permiso UI | Tabs condicionales, no un rol global |
| Pantallas | Tab bar + stacks modales |

## Quick path

1. Abrir la app autenticado o no. Sin sesión, el AuthSheet se ofrece al arrancar (se puede cerrar y seguir explorando).
2. Ver **Explorar**, **Favoritos**, **Boletas** y **Cuenta** (4 tabs fijos).
3. En Explorar, usar el FAB flotante para alternar entre lista y mapa.
4. Si hay promoter o membresía activa: **Operar**, con badge si hay evento hoy o invitación pending.

## Pantallas

| Pieza | Contenido |
|-------|-----------|
| Tab Explorar | [FEAT-005](feat-005-agenda.md) (listado + mapa con FAB toggle) |
| Tab Favoritos | [FEAT-040](feat-040-saved-tab.md); tablero de colecciones (recientes + eventos por ciudad/año + artistas) |
| Tab Boletas | [FEAT-024](feat-024-ticket-wallet.md); QRs de tickets |
| Tab Cuenta | [FEAT-012](feat-012-profile-me.md); label fijo |
| Tab bar | `TabBar` + `TabBarItem`: `bg-surface`, `shadow-tab`, aurora filled en activo, slate outline en idle |
| Stacks | Auth (modal), detalle evento/artista, checkout, impresión, scanner, invite |
| Web `<head>` | `WebHead` via `Screen`: `<title>` + description + og. `headTitle` / `title` / path (`Explorar`). Defaults in `+html.tsx`. Browser tabs, not campaign SEO (eso es Next) |

## Flujo

- Invitado: al arrancar se ofrece AuthSheet (X para seguir). Explorar + Favoritos (local) + Boletas (CTA login) + Cuenta (CTA). Seguir/guardar no piden cuenta. Comprar abre checkout y el auth sheet.
- En Explorar, FAB "Mapa" alterna a vista mapa; FAB "Lista" vuelve a la lista. En desktop/wide, ambas vistas aparecen lado a lado (split view).
- Tras login, el tab seleccionado se conserva si sigue existiendo. No redirigir a Operar solo por ser promoter.
- Acciones de un evento (editar, escanear, métricas) salen de la **mesa de ese evento** en Operar. El detalle público es para asistentes; staff llega con “Operar este evento”. Nunca un “modo admin” global.

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

- [ ] Invitado ve Favoritos (local) y Boletas (CTA login) y Cuenta; no ve Operar.
- [ ] FAB toggle funciona en Explorar para alternar entre lista y mapa.
- [ ] Staff de un solo evento ve Operar; no ve métricas de otros tenants.
- [ ] Chrome semántico (canvas + surface); tab bar `bg-surface` + `shadow-tab`; `aurora` filled en activo, slate en idle; `primary` inverso en CTAs.
- [ ] Parche logueado no se aplana a settings: sigue el home de perfil primario.
- [ ] En web, el tab del navegador muestra `Pantalla · Parche` (evento/artista usan el nombre).

## Relacionadas

[FEAT-004](feat-004-auth-session.md), [FEAT-027](feat-027-operate-hub.md), [FEAT-035](feat-035-deep-links.md)
