# Parche

App [Expo 57](https://docs.expo.dev/versions/v57.0.0/) para eventos en vivo. UI de flyer: blanco y negro, claro/oscuro del sistema, verde solo en confirmación.

Repo: [github.com/bue221/parche-app](https://github.com/bue221/parche-app) · Wiki (fuente en [`wiki/`](wiki/Home.md)): [github.com/bue221/parche-app/wiki](https://github.com/bue221/parche-app/wiki)

## Quick path

1. `pnpm install` (solo pnpm; npm/yarn/bun están bloqueados)
2. `pnpm start`
3. Abre iOS, Android o web desde el menú de Expo

Edita pantallas en `src/app/`. Tokens y reglas visuales: [`docs/ui/design.md`](docs/ui/design.md).

## Wiki

| Página | Contenido |
|--------|-----------|
| [Home](wiki/Home.md) | Qué es Parche |
| [Getting started](wiki/Getting-Started.md) | Clone, install, scripts |
| [Architecture](wiki/Architecture.md) | Capas y decisiones |
| [Visual system](wiki/Visual-System.md) | Tokens, pills, assets |
| [Agent conventions](wiki/Agent-Conventions.md) | Expo 57, pnpm, índice de `docs/` |

## Stack

Expo Router · NativeWind · React 19 · React Native 0.86 · TypeScript. Dependencias de datos (`react-query`, `zustand`, `zod`) están instaladas; las pantallas actuales aún no las usan.

## Docs para agentes

Índice en [`AGENTS.md`](AGENTS.md). Todo archivo nuevo bajo `docs/` debe indexarse ahí y en [`docs/README.md`](docs/README.md).
