# Getting started

Necesitas **Node ≥ 22.13**, **pnpm ≥ 10** y el CLI de Expo. El paquete se llama `parche` (`package.json`); el repo es `parche-app`.

## Quick path

1. `git clone https://github.com/bue221/parche-app.git && cd parche-app`
2. `pnpm install`
3. `pnpm start`
4. Elige iOS, Android o web en el menú de Expo.

## Detalles

| Tema | Decisión |
|------|----------|
| Gestor de paquetes | Solo pnpm. `preinstall` rechaza npm/yarn/bun. Lockfile: `pnpm-lock.yaml`. |
| Docs de Expo | Usar [docs versionadas de SDK 57](https://docs.expo.dev/versions/v57.0.0/), no la home sin versión. |
| Routing | Expo Router, archivos en `src/app/` (`index`, `explore`, `_layout`). |
| Estilos | NativeWind + tokens semánticos (`bg-background`, `text-foreground`). |
| Apariencia | `userInterfaceStyle: automatic` — el SO elige claro/oscuro. |

### Scripts

| Comando | Efecto |
|---------|--------|
| `pnpm start` | Metro / Expo |
| `pnpm ios` / `pnpm android` / `pnpm web` | Plataforma concreta |
| `pnpm lint` | `expo lint` |
| `pnpm reset-project` | Plantilla en blanco (no usar salvo que quieras tirar el starter) |

### Lo que no se commitea

`node_modules/`, `.expo/`, `ios/` y `android/` generados, `.env*.local`, lockfiles de otros gestores, y `.atl/`.

## Checklist

- [ ] `pnpm install` termina sin pedir npm
- [ ] `pnpm start` abre el QR / el menú
- [ ] Home muestra “WELCOME TO THE PARCHE”
- [ ] Cambiar claro/oscuro del SO invierte canvas y pills

## Next step

Mapa de carpetas en [Architecture](Architecture). Tokens y componentes en [Visual system](Visual-System).
