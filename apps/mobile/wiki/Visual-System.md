# Visual system

Parche es una UI **consumer foto-first** sobre chrome B/N: negro sobre blanco (claro) e invertido (oscuro). El color vive en artwork de eventos y en la pantalla de éxito (`confirm` `#7ffeb1`), que no cambia con el esquema.

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
| Pill relleno (`primary`) | negro / label blanco | blanco / label negro |
| Pill outline | borde y texto foreground | igual, invertido |
| Confirm | `#7ffeb1` | `#7ffeb1` |

Inter sustituye Favorit (títulos de pantalla y UI). Antonio sustituye Foggy (onboarding, auth hero, éxito). Tracking UI: `0.06em`. Pesos: 300, 400, 700 — no 500/600.

## Forma

| Pieza | Radio | Clase |
|-------|-------|-------|
| Tags | 100px | `rounded-tags` |
| Cards / imágenes | 16px | `rounded-cards` |
| Botones | 40px | `rounded-buttons` |

Pills: all-caps 12/700. Cards pueden tener un lift suave. Sin degradados en chrome. Sin color en botones, bordes o texto (salvo `confirm` en éxito).

## Assets

| Archivo | Uso |
|---------|-----|
| `assets/images/icon.png` | Default / oscuro (P blanca) |
| `assets/images/icon-light.png` | iOS claro y splash claro |
| `assets/brand/parche-mark.svg` | Marca vector |

## Checklist

- [ ] UI nueva usa tokens Parche, no el azul de Expo
- [ ] Botones son pills semánticos, no hex hardcodeados
- [ ] Display type solo en hero
- [ ] Claro y oscuro siguen siendo legibles (nada de pill negro sobre negro)

## Next step

Implementar con `Button` / `Text` en `src/components/ui`.
