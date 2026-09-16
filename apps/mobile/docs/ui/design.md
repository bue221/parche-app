# Parche visual system

Parche is a **consumer, photo-first** UI on an ink stage: black type on white paper in light mode, inverted in dark mode. The marketing site is a nocturnal canvas with the same pigment; the app stays ink + light/dark. The stage stays black/white so event artwork can lead. **Signal pigment** sits on top of that stage so the product is memorable: neon for action, volt for go, amber for wait, danger for stop.

Inter stands in for Favorit (UI). Antonio stands in for Foggy, and only appears on onboarding, auth hero, and success beats (print / door PASA).

The OS appearance drives the scheme (`userInterfaceStyle: automatic`). Stage primitives (`pitch-black`, `paper-white`, grays) stay fixed. Semantic tokens (`background`, `foreground`, `border`) invert. Pigments (`neon`, `volt`, `amber`, `danger`) **do not invert**.

## Quick path

1. Read tokens in `src/global.css` (light in `:root`, dark in `.dark`) and `tailwind.config.js`.
2. Style chrome with **semantic** classes (`bg-background`, `text-foreground`, `bg-primary`) so both schemes work. Use primitives when the color must stay the same in both modes (`bg-neon`, `bg-pitch-black`).
3. JS/theme surfaces: `useTheme()` and `useResolvedColorScheme()` in `src/hooks/use-theme.ts`.

## Why pigment

Black is the night. Alone it reads as a printer, not as a club. Neon on black (and neon on paper) is the thing people remember: selected chips, Live, primary pills, focus. Photos still carry the night’s color; chrome now carries **Parche**.

## Light vs dark

| Role | Light | Dark |
|------|-------|------|
| Canvas (`background`) | `#ffffff` | `#000000` |
| Text (`foreground`) | `#000000` | `#ffffff` |
| Filled pill (`primary`) | neon fill, black label | same (pigment does not invert) |
| Outlined pill | black border/text | white border/text |
| Soft fill (`muted`) | `#eeeeee` | `#333333` |
| Hairline (`border`) | `#d9d9d9` | `#333333` |
| Muted copy | `#595959` | `#808080` |
| Neon / volt / amber / danger | same hex in both schemes | same hex in both schemes |

Icons: `icon-light.png` on light surfaces, `icon.png` on dark. Native splash follows the same split in `app.json`.

## Tokens

### Stage (fixed)

| Role | Value | Tailwind |
|------|-------|----------|
| Ink / dark bands | `#000000` | `pitch-black` |
| Paper / inverse text | `#ffffff` | `paper-white` |
| Soft fills | `#eeeeee` | `ash-gray` |
| Hairlines / inputs | `#d9d9d9` | `concrete` |
| Nested copy | `#333333` | `charcoal` |
| Muted copy | `#595959` | `slate` |
| Helper / disabled | `#808080` | `stone` |

### Pigment (fixed, both schemes)

Pigment labels are always `pitch-black` (contrast ≥ 4.5:1 on these fills).

| Token | Value | Use |
|-------|-------|-----|
| `neon` | `#3DDCFF` | Brand signal. Primary CTA, selected chip, Live, focus ring, active tab, links, map pin |
| `volt` / `confirm` | `#7FFEB1` | Go. Success, door PASA, print stamp, live printer dot |
| `amber` | `#FFC44D` | Wait. Pending, tonight, warning, reserved ticket |
| `danger` | `#FF4D3D` | Stop. Error toast, invalid scan, destructive |

### Soft fills (invert with scheme)

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `neon-soft` | `#D6F6FF` | `#0A2830` | Selected row, tinted band, conversion panel |
| `volt-soft` | `#D6FFEC` | `#0E2A1C` | Success flash behind copy |
| `amber-soft` | `#FFF3D0` | `#2E2408` | Pending / warning surface |
| `danger-soft` | `#FFE6E3` | `#3A1410` | Error surface |

Type scale: `caption` 12, `body-sm` 14, `body` 16, `subheading` 18, `heading-sm` 24, `heading` 28, `display` 106 / 0.83. UI tracking is `0.06em` (`tracking-favorit`). Weights: 300 (quiet), 400, 700. Do not use 500/600.

Screen titles use Inter `heading` (24/28), not Antonio.

Spacing base is 4px (`ds-4` … `ds-120`). Page max width is 1200px. Section padding is 80px (`ds-80`).

| Shape | Radius | Class |
|-------|--------|-------|
| Tags | 100px | `rounded-tags` |
| Cards / images | 16px | `rounded-cards` / `rounded-images` |
| Small | 4px | `rounded-sm` |
| Nav | 20px | `rounded-navelements` |
| Buttons | 40px | `rounded-buttons` |

Cards may use **one** soft lift (`shadow-card` / `cardShadowStyle`). No gradients on chrome.

## Where pigment goes

| Surface | Token |
|---------|-------|
| Default filled button | `primary` → neon |
| Outlined / ghost | ink (`foreground`) |
| Selected chip / filter | `neon` fill, black label |
| Idle chip | `muted` |
| Live / tonight badge | `neon` |
| Success / PASA / print stamp | `confirm` (`volt`) |
| Pending / reserved | `amber` |
| Error / invalid / logout emphasis | `danger` |
| Focus ring | `neon` |
| Active tab (native + web) | `neon` |
| Map pin | neon / volt / amber by genre; selected = white fill + neon ring |
| Dark band (auth, manifesto) | always `pitch-black`; pigment is the accent, not the fill |
| Event artwork | photos lead; do not tint the flyer |

## Components

- **Filled pill:** `bg-primary` + `text-primary-foreground`, all-caps 12/700, 22×12 padding, 40px radius. Neon in both schemes. Default `Button` uses this.
- **Outlined pill:** 1px `border-foreground` on `background`; inverts with scheme.
- **Confirm pill:** `variant="confirm"` / `bg-confirm` for the success beat only (print, door PASA, transfer done).
- **Event card (listing):** 4:5 photo, 16px radius, date badge on the flyer, title / venue **below**. Default on Explorar. Dense lists and map use `row`. Featured rails use `poster` (scrim + meta on the photo). `selected` = neon border.
- **Search:** pill “¿Qué parche buscas?” plus horizontal genre/date chips.
- **Hero (auth / onboarding):** stacked display type is allowed. Event detail uses Inter title under a photo hero.
- **Dark band:** full-bleed `pitch-black` (always black). Use for auth/onboarding, not for every page header.
- **Flyer scrim:** the only allowed gradient. It sits on event artwork when a poster overlay is needed, never on chrome.

## Do

- Keep the **stage** black / white / gray. Put pigment on signals, not on the whole canvas.
- Use `bg-primary` for conversion actions (crear, comprar, entrar, continuar).
- Profile identity next to **Parche** is a B/N animal glyph (Tucán / Cóndor / Jaguar), not a color skin.
- Let the photo lead; type follows; neon marks what is active.
- Build chrome with semantic tokens so light and dark both work.
- Use Inter for screen titles.

## Don't

- Recolor the whole page. Neon is a spark, not a wash.
- Use `confirm` / volt on idle chrome (tabs, default chips, genre tags at rest).
- Drop shadows or gradients on nav, buttons, or tab chrome (card lift is the exception).
- Antonio/Foggy on tab titles, cards, or forms.
- Sharp or lightly rounded buttons.
- White labels on neon / volt / amber / danger (contrast fails). Use `pitch-black`.

## Assets

| File | Use |
|------|-----|
| `assets/images/icon.png` | App Store / default (black, white P) |
| `assets/images/icon-light.png` | iOS light |
| `assets/images/icon-tinted.png` | iOS tinted |
| `assets/images/android-icon-*` | Adaptive icon layers |
| `assets/images/favicon.png` | Web tab |
| `assets/images/splash-icon.png` | Fallback splash mark |
| `assets/brand/parche-mark.svg` | Vector mark |
| `assets/fonts/Inter-*.ttf` | UI type (Favorit stand-in); loaded in `src/app/_layout.tsx` |
| `assets/fonts/Antonio-Regular.ttf` | Hero display (Foggy stand-in); loaded in `src/app/_layout.tsx` |

## Checklist

- [ ] New UI uses Parche tokens, not Expo blue
- [ ] Buttons are pills (`rounded-buttons`) and use `primary` (neon) / `foreground`, not hardcoded black/white
- [ ] Display type is onboarding / auth / success only
- [ ] Volt/`confirm` is success, not the default chip
- [ ] Neon marks selected / live / focus / primary CTA
- [ ] Light and dark both remain readable

## Next step

Build screens with `Button` / `Text` / `EventCard` / `SearchBar` in `src/components` and the tokens above.
