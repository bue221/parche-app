# Visual system

Parche es una UI **consumer foto-first** sobre el mismo canvas que la web: noche suave (`#07070C`) o papel frío (`#F4F4F7`). El artwork de eventos sigue llevando la noche. Encima va **pigmento de señal**: aurora en selección/foco, neon en mapa, volt en éxito, amber en espera, danger en error. El CTA primario es **inverso** (negro↔blanco).

La fuente de verdad para agentes es [`docs/ui/design.md`](../docs/ui/design.md). Esta página es el resumen para humanos. Alineado con la web (`web-frontend/docs/ui/design.md`).

## Quick path

1. Tokens: `src/global.css` (`:root` claro, `.dark` oscuro) + `src/lib/theme.ts` (`THEME_VARS`).
2. Chrome: clases semánticas (`bg-background`, `bg-surface`, `text-foreground`, `bg-primary`).
3. JS: `useTheme()` y `useResolvedColorScheme()` en `src/hooks/use-theme.ts`.

## Light vs dark

| Rol | Claro | Oscuro |
|-----|-------|--------|
| Canvas (`background`) | `#F4F4F7` | `#07070C` |
| Superficie (`surface`) | `#FFFFFF` | `#12121A` |
| Texto (`foreground`) | `#0B0B12` | `#F5F5F8` |
| Pill relleno (`primary`) | inverso / label opuesto | inverso |
| Pill signal | aurora / label negro | igual (no invierte) |
| Aurora | `#B8A4FF` | `#B8A4FF` |
| Neon | `#3DDCFF` | `#3DDCFF` |
| Confirm / volt | `#7FFEB1` | `#7FFEB1` |

Inter sustituye Favorit (títulos de pantalla y UI). Antonio sustituye Foggy (onboarding, auth hero, éxito). Tracking caption: `0.08em`. Pesos: 350, 400, 700 — no 500/600.

## Pigmento

| Token | Hex | Uso |
|-------|-----|-----|
| `aurora` | `#B8A4FF` | Chip seleccionado, Live, tab activo, foco, `signal` |
| `neon` | `#3DDCFF` | Pin de mapa / destello secundario |
| `volt` / `confirm` | `#7FFEB1` | Éxito, PASA, sello de print |
| `amber` | `#FFC44D` | Pendiente, warning |
| `danger` | `#FF4D3D` | Error, scan inválido |

Labels sobre pigmento: siempre negro. Aurora es chispa, no un lavado de toda la pantalla.

## Forma

| Pieza | Radio | Clase |
|-------|-------|-------|
| Tags | 100px | `rounded-tags` |
| Cards / imágenes | 20px | `rounded-cards` |
| Botones | 40px | `rounded-buttons` |

Pills: all-caps 12/700. Cards pueden tener un lift suave (`shadow-card`). Chips, botones e inputs usan un lift más chico (`shadow-control` / `shadow-button`) y un anillo aurora al foco (`shadow-focus`). El tab bar mobile usa lift hacia arriba (`shadow-tab`) sobre `bg-surface`. Sin degradados en chrome. Cada perfil se diferencia con un animal colombiano en B/N al lado de Parche (Tucán, Cóndor, Jaguar), no con un color de chrome.

## Assets

| Archivo | Uso |
|---------|-----|
| `assets/images/icon.png` | Default / oscuro (P blanca) |
| `assets/images/icon-light.png` | iOS claro y splash claro |
| `assets/brand/parche-mark.svg` | Marca vector |

## Checklist

- [ ] UI nueva usa tokens Parche, no el azul de Expo
- [ ] Botones default = `primary` inverso; highlight = `signal` (aurora)
- [ ] Display type solo en hero / éxito
- [ ] Volt/`confirm` es éxito, no el chip en reposo
- [ ] Claro y oscuro siguen siendo legibles (toggle + sistema)

## Next step

Implementar con `Button` / `Text` en `src/components/ui`.
