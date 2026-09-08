# Parche

Parche es una app **Expo 57** (iOS, Android y web) para eventos en vivo. La UI es un flyer de concierto en blanco y negro: tinta sobre papel en claro, invertido en oscuro. El verde de confirmación no forma parte del chrome.

El código vive en [`bue221/parche-app`](https://github.com/bue221/parche-app). Las reglas de producto están en `docs/` del repo; esta wiki es la guía humana para arrancar, entender la forma y no romper el sistema visual.

## Quick path

1. Clona el repo y entra a la raíz del frontend.
2. Instala con **pnpm** (`pnpm install`). `npm`, `yarn` y `bun` están bloqueados.
3. Arranca con `pnpm start` y abre simulador, Expo Go o web.
4. Edita pantallas en `src/app/` y tokens en `src/global.css` + `docs/ui/design.md`.

## Qué hay hoy

| Pieza | Dónde |
|-------|--------|
| Rutas (tabs Home / Explore) | `src/app/` |
| Tokens y tema | `src/global.css`, `src/hooks/use-theme.ts` |
| Botón / texto / icono | `src/components/ui/` |
| Sistema visual | [Visual system](Visual-System) y `docs/ui/design.md` |
| Convenciones para agentes | [Agent conventions](Agent-Conventions) |

## Next step

Si es tu primera vez en el repo, sigue [Getting started](Getting-Started). Si vas a tocar UI, lee [Visual system](Visual-System) antes de escribir estilos.
