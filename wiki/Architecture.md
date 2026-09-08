# Architecture

Parche es un **cliente Expo universal**: una sola base TypeScript para nativo y web. No hay backend en este repo. El estado de UI es local (hooks + primitives); hay dependencias listas para datos (`@tanstack/react-query`, `zustand`, `react-hook-form` + `zod`) pero las pantallas actuales aún no las usan.

## Quick path

1. Entra por `src/app/_layout.tsx`: fuentes, tema, tabs, splash animado.
2. Las pantallas son archivos de ruta: `index.tsx` (Home), `explore.tsx`.
3. El chrome reutilizable está en `src/components/`; los tokens en CSS + `src/hooks/use-theme.ts`.

## Capas

| Capa | Responsabilidad | Integración |
|------|-----------------|-------------|
| `src/app/` | Rutas y layout de Expo Router | No importa APIs de negocio aún |
| `src/components/ui/` | Primitivos (Button, Text, Icon) | Consumen tokens semánticos |
| `src/components/` | Composición de pantalla (tabs, splash, hints) | Pueden tener variantes `.web.tsx` |
| `src/hooks/` | Esquema de color y `useTheme()` | OS appearance → clases `.dark` |
| `src/lib/` | `cn()`, `NAV_THEME` | Utilidades compartidas |
| `src/constants/theme.ts` | Spacing, radios, anchos | JS cuando NativeWind no alcanza |
| `docs/` | Reglas de producto (fuente de verdad) | Indexadas en `docs/README.md` y `AGENTS.md` |

## Decisiones

| Tema | Decisión | Por qué |
|------|----------|---------|
| `src/` como raíz de app | Expo Router con `src/app` | Separa assets de código |
| Semántica vs primitivos | `background`/`foreground` invierten; `pitch-black` no | Un dark band debe seguir negro en ambos modos |
| pnpm only | `engines` + `preinstall` | Un lockfile, mismos installs |
| Wiki vs `docs/` | `docs/` para agentes y PRs; wiki para onboarding humano | Evita duplicar reglas: la wiki enlaza, no reemplaza |

## Errores y límites

- Fallos de fuentes: el layout no monta tabs hasta `useFonts` — splash nativo cubre el hueco.
- No hay capa de red todavía: cuando exista API, errores de red deben quedar en un cliente (React Query) y mensajes de usuario en la UI, no en `fetch` sueltos por pantalla.
- Variantes web (`*.web.tsx`) existen para tabs e icono animado; un cambio de comportamiento nativo hay que repetir o extraer a un módulo compartido.

## Checklist

- [ ] Nueva pantalla = archivo en `src/app/`, no una ruta manual
- [ ] Nuevo doc en `docs/` = fila en `docs/README.md` y `AGENTS.md`
- [ ] Estilos de chrome usan tokens semánticos, no hex sueltos

## Next step

[Visual system](Visual-System) para tokens, pills y assets.
