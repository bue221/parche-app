# Parche visual system (app)

Parche is a **consumer, photo-first** UI on the same canvas as the marketing web: soft night (`#07070C`) or cold paper (`#F4F4F7`). Event artwork still leads. **Aurora** (`#B8A4FF`) is the brand spark — selected chips, Live, focus, active tab. The CTA primario is **inverse** (black on light, white on dark). Neon, volt, amber and danger stay signal pigment (map pins, success, wait, stop).

Inter stands in for Favorit (UI + screen titles). Antonio stands in for Foggy on onboarding, auth hero, and success beats (print / door PASA) only.

The OS appearance drives the default scheme (`userInterfaceStyle: automatic`); the in-app toggle can force `light` / `dark` via `theme-store`. Stage primitives stay fixed. Semantic tokens (`background`, `foreground`, `surface`, `primary`, `border`) invert. Pigments (`aurora`, `neon`, `volt`, `amber`, `danger`) **do not invert**.

Aligned with `web-frontend/docs/ui/design.md` — same hex roles, same primary/aurora split.

## Quick path

1. Tokens: `src/global.css` (light in `:root`, dark in `.dark` / `prefers-color-scheme`) + runtime vars in `src/lib/theme.ts` (`THEME` / `THEME_VARS`).
2. Style chrome with **semantic** classes (`bg-background`, `bg-surface`, `text-foreground`, `bg-primary`) so both schemes work. Use primitives when the color must stay the same (`bg-aurora`, `bg-neon`, `bg-pitch-black`).
3. JS theme: `useTheme()` and `useResolvedColorScheme()` in `src/hooks/use-theme.ts`. `ThemeRoot` applies `THEME_VARS` + StatusBar.

## Why pigment

Black alone reads as a printer, not a club. Aurora on the stage is what people remember for selection and focus. Neon stays for map / secondary spark. Photos carry the night; chrome carries **Parche**.

## Light vs dark

| Role | Light | Dark |
|------|-------|------|
| Canvas (`background`) | `#F4F4F7` | `#07070C` |
| Surface / card | `#FFFFFF` | `#12121A` |
| Text (`foreground`) | `#0B0B12` | `#F5F5F8` |
| Filled pill (`primary`) | `#0B0B12` / label `#F5F5F8` | `#F5F5F8` / label `#0B0B12` |
| Soft fill (`muted`) | `#ECECF1` / text `#5C5C6E` | `#1C1C26` / text `#9A9AAB` |
| Hairline (`border`) | ink @ 10% | paper @ 10% |
| Highlight (`aurora` / `ring`) | `#B8A4FF` | same |
| Neon / volt / amber / danger | same hex in both schemes | same |

Icons: `icon-light.png` on light surfaces, `icon.png` on dark. Native splash follows the same split in `app.json`.

## Tokens

### Stage (fixed)

| Role | Value | Tailwind |
|------|-------|----------|
| Ink / dark bands | `#07070C` | `pitch-black` |
| Paper / inverse text | `#F5F5F8` | `paper-white` |
| Soft fills | `#ECECF1` | `ash-gray` |
| Selected / pressed light | `#E2E2EA` | `concrete` |
| Nested / muted dark | `#1C1C26` | `charcoal` |
| Muted copy light | `#5C5C6E` | `slate` |
| Helper / disabled | `#8A8A9B` | `stone` |

### Pigment (fixed, both schemes)

Pigment labels are always `pitch-black` (contrast ≥ 4.5:1 on these fills), except `glass` tags on photos (`paper-white`).

| Token | Value | Use |
|-------|-------|-----|
| `aurora` / `heat` | `#B8A4FF` | Brand spark. Selected chip, Live, focus ring, active tab, links, `Button variant="signal"` |
| `neon` | `#3DDCFF` | Map pin default / secondary spark |
| `volt` / `confirm` | `#7FFEB1` | Go. Success, door PASA, print stamp |
| `amber` | `#FFC44D` | Wait. Pending, tonight, warning |
| `danger` | `#FF4D3D` | Stop. Error toast, invalid scan, destructive |

### Soft fills (invert with scheme)

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `aurora-soft` / `heat-soft` | `#ECE6FF` | `#2A2248` | Selected row, accent band |
| `neon-soft` | `#D6F6FF` | `#0A2830` | Map / neon tint |
| `volt-soft` | `#D6FFEC` | `#0E2A1C` | Success flash |
| `amber-soft` | `#FFF3D0` | `#2E2408` | Pending surface |
| `danger-soft` | `#FFE6E3` | `#3A1410` | Error surface |

Type scale: `caption` 12 (uppercase + `tracking-favorit` 0.08em), `body-sm` 14, `body` 16, `subheading` 18, `heading-sm` 22, `heading` 28, `display` 72→106. Weights: 350 (quiet), 400, 700. Do not use 500/600.

Screen titles use Inter `heading` (22/28), not Antonio.

Spacing base is 4px (`ds-4` … `ds-120`). Page max width is 1280px. Section padding is 80px (`ds-80`).

| Shape | Radius | Class |
|-------|--------|-------|
| Tags | 100px | `rounded-tags` |
| Cards / images | 20px | `rounded-cards` / `rounded-images` |
| Small | 8px | `rounded-sm` / `rounded-small` |
| Nav | 28px | `rounded-navelements` |
| Buttons | 40px | `rounded-buttons` |

Cards may use **one** soft lift (`shadow-card` / `cardShadowStyle`). Content chrome: `bg-surface border-border`. No gradients on chrome; flyer scrim is the exception.

## Where pigment goes

| Surface | Token |
|---------|-------|
| Default filled button | `primary` → inverse ink/paper |
| Brand / highlight pill | `signal` → `aurora`, black label |
| Outlined / ghost | ink (`foreground` / `border`) |
| Selected chip / filter | `aurora` fill, black label |
| Idle chip | `muted` |
| Live / tonight / published badge | `aurora` |
| Success / PASA / print stamp | `confirm` (`volt`) |
| Pending / reserved | `amber` |
| Error / invalid / logout emphasis | `danger` |
| Focus ring / field focus | `aurora` |
| Active tab (native + web) | `aurora` |
| Map pin | neon / volt / amber by genre; selected = white fill + neon ring |
| Dark band (auth, manifesto) | always `pitch-black`; pigment is the accent, not the fill |
| Event artwork | photos lead; do not tint the flyer |

## Components

- **Filled pill:** `bg-primary` + `text-primary-foreground`, all-caps 12/700, 22×12 padding, 40px radius. Inverse in both schemes. Default `Button` uses this.
- **Signal pill:** `variant="signal"` / `bg-aurora` for brand highlight CTAs.
- **Outlined pill:** 1px `border-border` on transparent; inverts with scheme.
- **Confirm pill:** `variant="confirm"` / `bg-confirm` for the success beat only.
- **Event card (listing):** 4:5 photo, 20px radius, date badge on the flyer, title / venue **below**. Default on Explorar. Dense lists and map use `row` (`bg-surface`). Featured rails use `poster` (scrim + meta on the photo). `selected` = aurora border.
- **Search:** pill “¿Qué parche buscas?” on `bg-surface` plus horizontal genre/date chips.
- **Hero (auth / onboarding):** Antonio display type is allowed. Event detail uses Inter title under a photo hero.
- **Dark band:** full-bleed `pitch-black`. Use for auth/onboarding, not for every page header.
- **Flyer scrim:** the only allowed gradient. It sits on event artwork when a poster overlay is needed, never on chrome.

## Do

- Keep the **stage** on semantic canvas + surface. Put pigment on signals, not on the whole screen.
- Use `bg-primary` for conversion actions (crear, comprar, entrar, continuar).
- Profile identity next to **Parche** is a B/N animal glyph (Tucán / Cóndor / Jaguar), not a color skin.
- Let the photo lead; type follows; aurora marks what is active.
- Build chrome with semantic tokens so light and dark both work.
- Use Inter for screen titles.

## Don't

- Recolor the whole page. Aurora/neon are sparks, not a wash.
- Use `confirm` / volt on idle chrome (tabs, default chips, genre tags at rest).
- Use neon for primary CTA or selected chips (that's aurora / inverse primary now).
- Drop shadows or gradients on nav, buttons, or tab chrome (card lift is the exception).
- Antonio/Foggy on tab titles, cards, or forms.
- Sharp or lightly rounded buttons.
- White labels on aurora / neon / volt / amber / danger (contrast fails). Use `pitch-black`.

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
- [ ] Buttons are pills (`rounded-buttons`); default = inverse `primary`; brand highlight = `signal` (aurora)
- [ ] Display type is onboarding / auth / success only
- [ ] Volt/`confirm` is success, not the default chip
- [ ] Aurora marks selected / live / focus / active tab
- [ ] Light and dark both remain readable (toggle + system)

## Next step

Build screens with `Button` / `Text` / `EventCard` / `SearchBar` in `src/components` and the tokens above. Interaction recipes: [ux.md](ux.md).
