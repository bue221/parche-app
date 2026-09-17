# Parche visual system (web)

La web de Parche es un **escenario foto-primero**. El canvas es noche suave (oscuro) o papel frío (claro). Encima va chrome de vidrio: nav flotante, search pill, cards con scrim. **Aurora** (`#B8A4FF`) marca la palabra clave y el foco. El CTA primario es **inverso** — blanco en oscuro, negro en claro. Neon, volt, amber y danger siguen siendo pigmento de señal.

Inter cubre UI y display (`font-favorit`). Antonio (`font-foggy`) queda para sellos tipográficos del mark y del ticket (`NOS VEMOS EN EL PARCHE`), no para títulos de sección.

Fuente de verdad: `src/app/globals.css`. Preview interno: `/sistema`. Tokens JS: `src/constants/theme.ts`.

## Quick path

1. Tokens: `src/app/globals.css` (`:root` claro, `.dark` / `prefers-color-scheme: dark` oscuro, override `html.light` / `html.dark`).
2. Chrome semántico: `bg-background`, `text-foreground`, `bg-primary`, `bg-surface`, `bg-glass`, `border-border`.
3. Construir con `Button` / `Text` / `Tag` / `Container` / `Section` en `src/components/ui`. Landing en `src/components/landing`.

## Light vs dark

| Rol | Claro | Oscuro |
|-----|-------|--------|
| Canvas (`background`) | `#F4F4F7` | `#07070C` |
| Texto (`foreground`) | `#0B0B12` | `#F5F5F8` |
| Superficie (`surface` / `card`) | `#FFFFFF` | `#12121A` |
| Popover | surface | `#16161F` |
| CTA (`primary`) | `#0B0B12` / label `#F5F5F8` | `#F5F5F8` / label `#0B0B12` |
| Muted | `#ECECF1` / text `#5C5C6E` | `#1C1C26` / text `#9A9AAB` |
| Border / input | ink @ 10–12% | paper @ 10–14% |
| Glass | white @ 72% | night @ 62% |
| Glass strong | white @ 92% | surface @ 88% |
| Highlight (`aurora` / `ring`) | `#B8A4FF` | igual (no se invierte) |
| Search pill | siempre vidrio claro + texto oscuro | igual |

El tema se resuelve con clase en `html` (`light` / `dark`) o, sin clase forzada, con `prefers-color-scheme`.

## Stage (primitivos fijos)

| Token | Hex | Uso |
|-------|-----|-----|
| `pitch-black` | `#07070C` | Tinta dura, labels sobre pigmento, date badge |
| `paper-white` | `#F5F5F8` | Papel / texto sobre tinta |
| `ash-gray` | `#ECECF1` | Soft fill claro |
| `concrete` | `#E2E2EA` | Selected / pressed claro |
| `charcoal` | `#1C1C26` | Soft fill oscuro / ticket viewport |
| `slate` | `#5C5C6E` | Muted copy claro |
| `stone` | `#8A8A9B` | Helper / disabled |

## Pigmento (no invierte)

Labels sobre pigmento: siempre `pitch-black` (contraste ≥ 4.5:1).

| Token | Hex | Uso |
|-------|-----|-----|
| `aurora` / `heat` | `#B8A4FF` | Palabra clave, foco (`ring`), chip Live / Hoy, selection |
| `neon` | `#3DDCFF` | Mapa, destello secundario en `page-glow` |
| `volt` / `confirm` | `#7FFEB1` | Éxito, sello de ticket PASA |
| `amber` | `#FFC44D` | Espera / pendiente |
| `danger` | `#FF4D3D` | Error / inválido |

### Soft fills (sí invierten)

| Token | Claro | Oscuro |
|-------|-------|--------|
| `aurora-soft` / `heat-soft` | `#ECE6FF` | `#2A2248` |
| `neon-soft` | `#D6F6FF` | `#0A2830` |
| `volt-soft` | `#D6FFEC` | `#0E2A1C` |
| `amber-soft` | `#FFF3D0` | `#2E2408` |
| `danger-soft` | `#FFE6E3` | `#3A1410` |

Aurora es chispa, no un lavado de pantalla. El acento semántico `accent` apunta a `aurora-soft`.

## Tipografía

| Rol | Familia | Variable / clase |
|-----|---------|------------------|
| UI + display | Inter | `--font-inter` → `font-favorit` / `font-sans` |
| Sello / ticket | Antonio | `--font-antonio` → `font-foggy` |

Pesos: `quiet` 350, `regular` 400, `bold` 700. No usar 500/600.

| Variant (`Text`) | Size | Tracking | Notas |
|------------------|------|----------|-------|
| `caption` | 12 / 1.21 | `0.08em` (`tracking-favorit`) | Uppercase + bold |
| `bodySm` / `muted` | 14 / 1.45 | 0 | Muted usa `text-muted-foreground` |
| `default` / `lead` | 16 / 1.5 | 0 | Lead = muted body |
| `subheading` | 18 / 1.35 | −0.01em | Bold |
| `headingSm` | 22 / 1.2 | −0.02em | Bold |
| `heading` | 28 / 1.15 | −0.03em | Bold; títulos de sección |
| `display` | `clamp(2.75rem, 7vw, 4.75rem)` / 0.95 | −0.04em | Inter 700, mixed case |
| `helper` | caption | 0 | `font-quiet`, `text-stone`, no uppercase |

Display Inter mixed-case. No usar Antonio bajo ~80px salvo sellos. Eyebrows de sección: caption bold + `text-aurora`.

## Forma, sombra y layout

| Pieza | Radio | Clase |
|-------|-------|-------|
| Tags | 100px | `rounded-tags` |
| Cards / fotos / images | 20px | `rounded-cards` / `rounded-images` |
| Nav elements | 28px | `rounded-navelements` |
| Buttons | 40px | `rounded-buttons` |
| Nav / search | pill | `rounded-full` |
| Small | 8px | `rounded-sm` / `rounded-small` |

| Token | Claro | Oscuro |
|-------|-------|--------|
| `shadow-card` | `0 18px 50px` ink @ 8% | `0 22px 50px` black @ 45% |
| `shadow-glass` | `0 10px 40px` ink @ 8% | `0 12px 40px` black @ 35% |

- Spacing base 4px (`ds-4` … `ds-120`). Sección: `py-ds-48` / `md:py-ds-80`.
- Ancho de página: `max-w-page` = **1280px**, padding horizontal `px-ds-24`.
- Easing: `--ease-parche` = `cubic-bezier(0.16, 1, 0.3, 1)`.
- Utilidad `glass-panel`: `bg-glass` + `shadow-glass` + `backdrop-blur(22px)` + border.

## Cards

Hay dos familias. No mezclar meta debajo de la foto en listing foto-primero.

### 1. Poster / evento (foto-primero)

UsEventCard` en `featured-events.tsx` y tiles en `city-explore.tsx`:

- Contenedor: `aspect-4/5`, `rounded-cards`, `bg-surface`, `shadow-card`, overflow hidden.
- Foto full-bleed; hover scale `1.05` con `motion-safe` + `ease-parche`.
- Scrim: clase `.card-photo-scrim` (gradiente vertical a `pitch-black` @ ~55–78%, transparente hasta ~42% para que el flyer se lea en card).
- Meta **sobre** la foto (abajo): título `subheading` bold `paper-white`, venue caption @ 75%, tags `tone="glass"`.
- Date badge: top-left, `bg-pitch-black/70` + blur; heart ghost top-right.
- Focus: `ring-2 ring-aurora`.

### 2. Contenido / chrome

FAQ, how-it-works, download CTA, empty panel, ticket demo frame:

- `rounded-cards border border-border bg-surface shadow-card` (+ padding `p-ds-24` o similar).
- Empty state: mismo radio/sombra, border **dashed**.
- No gradient en el chrome; el único gradient permitido es scrim sobre foto (`hero-photo-scrim`, `card-photo-scrim`) o el glow atmosférico `page-glow`.

## Chrome y superficies especiales

| Pieza | Patrón |
|-------|--------|
| Nav flotante | `fixed`, pill `rounded-full`, `bg-glass border-border shadow-glass backdrop-blur-xl` (`site-header.tsx`) |
| Search pill | `.search-pill`: siempre blanco ~94%, texto `#0B0B12`, sombra fuerte; no sigue el tema |
| Hero | Foto full-bleed + `.page-glow` + `.hero-photo-scrim`; palabra clave en `text-aurora` |
| Section `band="ink"` | `bg-foreground text-background` (inverso semántico) |
| Ticket viewport | fondo `#1C1C26`; animaciones `parche-print-*` |
| Night map | `.night-map-scene` grid sobre muted / night |
| Focus | siempre `ring-aurora` |

## Componentes

### Button (`src/components/ui/button.tsx`)

Pill `rounded-buttons`, caption bold uppercase `tracking-favorit`, padding 22×12.

| Variant | Look |
|---------|------|
| `default` | Inverse `bg-primary` + `shadow-glass` |
| `outline` | Border + transparent |
| `secondary` | `bg-secondary` |
| `ghost` | Transparent → muted |
| `signal` | `bg-aurora text-pitch-black` |
| `glass` | `bg-glass` + blur |
| `link` | `text-aurora`, normal-case, sin tracking de caption |

### Tag (`src/components/ui/tag.tsx`)

`rounded-tags`, caption bold uppercase. Tones: `ink`, `muted`, `glass`, `heat` / `aurora`, `confirm`, `amber`, `danger`. Pigmento → label negro. `glass` = tinta @ 55% + blur (sobre fotos).

### Text / layout

- `Text` variants arriba.
- `Container` / `Section` / `SectionHeading` / `EmptyPanel` / `Stack` en `layout.tsx`.

## Motion

Animaciones: `parche-stamp`, `parche-rise`, `parche-fade`, `parche-blink`, `parche-print-*`. Reveal on scroll via `Reveal`. Respetar `prefers-reduced-motion`: sin scroll smooth, sin reveal/ticket animados.

## Do / Don't

- Foto primero. El texto se lee sobre scrim, no sobre un bloque de color plano.
- CTA primario = inverse. Aurora para highlight / `signal`, no para el botón principal por defecto.
- Volt/`confirm` no es el chip en reposo.
- Pigmento fija labels en negro; no poner labels blancos sobre aurora/neon/volt/amber/danger.
- Inter en UI y display; Antonio solo en sellos del mark/ticket.
- Semántica (`background`, `surface`, `primary`) para chrome; primitivos (`pitch-black`, `aurora`) cuando el color no debe invertir.

## Checklist

- [ ] UI nueva usa tokens Parche (`background`, `surface`, `aurora`, `primary`, `glass`)
- [ ] Botón default es inverse; `variant="signal"` es aurora
- [ ] Cards de evento: poster 4:5 + scrim + meta on-photo; cards de contenido: surface + border + `shadow-card`
- [ ] Display Inter mixed-case; caption uppercase solo en labels/chips/botones
- [ ] Claro y oscuro siguen siendo legibles; search pill permanece claro
- [ ] Landing hero / ticket respetan `prefers-reduced-motion`

## Next step

Composición de marketing en `src/components/landing`. Primitivos en `src/components/ui`. Catálogo en `/sistema`.
