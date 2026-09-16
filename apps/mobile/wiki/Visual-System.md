# Visual system

Parche es una UI **consumer foto-first** sobre un escenario de tinta: negro sobre blanco (claro) e invertido (oscuro). La landing de marketing es un canvas nocturno con los mismos tokens. El artwork de eventos sigue llevando la noche. Encima va **pigmento de señal** para que el producto se recuerde: neon en acción, volt en éxito, amber en espera, danger en error.

La fuente de verdad para agentes es [`docs/ui/design.md`](https://github.com/bue221/parche-app/blob/main/docs/ui/design.md). Esta página es el resumen para humanos.

## Quick path

1. Tokens: `src/global.css` (`:root` claro, `.dark` oscuro) y `tailwind.config.js`.
2. Chrome: clases semánticas (`bg-background`, `text-foreground`, `bg-primary`).
3. JS: `useTheme()` y `useResolvedColorScheme()` en `src/hooks/use-theme.ts`.

## Light vs dark

| Rol | Claro | Oscuro |
|-----|-------|--------|
| Canvas (`background`) | `#ffffff` | `#000000` |
| Texto (`foreground`) | `#000000` | `#ffffff` |
| Pill relleno (`primary`) | neon / label negro | igual (el pigmento no se invierte) |
| Pill outline | borde y texto foreground | igual, invertido |
| Neon | `#3DDCFF` | `#3DDCFF` |
| Confirm / volt | `#7FFEB1` | `#7FFEB1` |

Inter sustituye Favorit (títulos de pantalla y UI). Antonio sustituye Foggy (onboarding, auth hero, éxito). Tracking UI: `0.06em`. Pesos: 300, 400, 700 — no 500/600.

## Pigmento

| Token | Hex | Uso |
|-------|-----|-----|
| `neon` | `#3DDCFF` | CTA, chip seleccionado, Live, tab activo, pin (y volt/amber en el mapa por género), foco |
| `volt` / `confirm` | `#7FFEB1` | Éxito, PASA, sello de print |
| `amber` | `#FFC44D` | Pendiente, warning |
| `danger` | `#FF4D3D` | Error, scan inválido |

Labels sobre pigmento: siempre negro. Neon es chispa, no un lavado de toda la pantalla.

## Forma

| Pieza | Radio | Clase |
|-------|-------|-------|
| Tags | 100px | `rounded-tags` |
| Cards / imágenes | 16px | `rounded-cards` |
| Botones | 40px | `rounded-buttons` |

Pills: all-caps 12/700. Cards pueden tener un lift suave. Sin degradados en chrome. Cada perfil se diferencia con un animal colombiano en B/N al lado de Parche (Tucán, Cóndor, Jaguar), no con un color de chrome.

## Assets

| Archivo | Uso |
|---------|-----|
| `assets/images/icon.png` | Default / oscuro (P blanca) |
| `assets/images/icon-light.png` | iOS claro y splash claro |
| `assets/brand/parche-mark.svg` | Marca vector |

## Checklist

- [ ] UI nueva usa tokens Parche, no el azul de Expo
- [ ] Botones son pills `primary` (neon), no hex hardcodeados
- [ ] Display type solo en hero
- [ ] Volt/`confirm` es éxito, no el chip en reposo
- [ ] Claro y oscuro siguen siendo legibles

## Next step

Implementar con `Button` / `Text` en `src/components/ui`.
