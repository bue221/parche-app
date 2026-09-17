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

Cards may use **one** soft lift (`shadow-card` / `cardShadowStyle`). Interactive chrome uses a smaller lift: idle chips/fields/search (`shadow-control`), filled CTAs (`shadow-button`), brand highlight (`shadow-signal`), success (`shadow-confirm`). Focus and selected chips add an aurora ring (`shadow-focus`); invalid fields use `shadow-error`. The mobile tab bar uses **one** upward lift (`shadow-tab` / `tabBarShadowStyle`) on `bg-surface`. Content chrome: `bg-surface`. No gradients on chrome; flyer scrim is the exception.

## Where pigment goes

| Surface | Token |
|---------|-------|
| Default filled button | `primary` → inverse ink/paper |
| Brand / highlight pill | `signal` → `aurora`, black label |
| Outlined / ghost | ink (`foreground` / `border`) |
| Selected chip / filter | `aurora` fill, black label, `shadow-focus` ring |
| Idle chip | `surface` + `foreground` label, `shadow-control` |
| Live / tonight / published badge | `aurora` |
| Success / PASA / print stamp | `confirm` (`volt`) |
| Pending / reserved | `amber` |
| Error / invalid / logout emphasis | `danger` |
| Focus ring / field focus | `aurora` |
| Active tab (native + compact web) | filled `aurora` icon + bold aurora label; idle = `slate` / `muted-foreground` |
| Map pin | Date pill on the map (`Hoy` / `18 sep`). Genre dot neon / volt / amber. Selected = aurora fill. Tiles are OSM Humanitarian, saturated — never grayscale |
| Dark band (auth, manifesto) | always `pitch-black`; pigment is the accent, not the fill |
| Event artwork | photos lead; do not tint the flyer |
| Map tiles | OSM Humanitarian. Saturate for parks/roads; never grayscale or invert |

## Components

- **Filled pill:** `bg-primary` + `text-primary-foreground`, all-caps 12/700, 22×12 padding, 40px radius, `shadow-button`. Inverse in both schemes. Default `Button` uses this. Press scale `0.98`.
- **Signal pill:** `variant="signal"` / `bg-aurora` + `shadow-signal` for brand highlight CTAs.
- **Outlined pill:** 1px `border-border` on `bg-surface` with `shadow-control`; inverts with scheme.
- **Confirm pill:** `variant="confirm"` / `bg-confirm` + `shadow-confirm` for the success beat only.
- **Event card (listing):** 4:5 photo, 20px radius, date badge on the flyer, title / venue **below**. Default on Explorar. Optional save heart (glass on photo, 44px hit). Dense lists use `row` (`bg-surface`). Map sheet listing uses the same card with `widePhoto` (16:10). Explorar rails reuse `listing` with peek; `poster` (scrim + meta on the photo) is not the Explorar rail. `selected` = aurora border.
- **Search:** pill “¿Qué parche buscas?” is the Explorar hero on `bg-surface` with `shadow-control` and a muted icon well. Horizontal chips with icon: Todo + day windows + genres. No Inter page title on the tab.
- **Hero (auth / onboarding):** Antonio display type is allowed. Event detail uses Inter title under a photo hero.
- **Dark band:** full-bleed `pitch-black`. Use for auth/onboarding, not for every page header.
- **Flyer scrim:** the only allowed gradient. It sits on event artwork when a poster overlay is needed, never on chrome.
- **Tab bar (mobile):** custom JS chrome in `TabBar` / `TabBarItem`. Equal `flex: 1` cells. Icon well 32px, glyph 28px medium. Idle = outline; selected = fill + aurora (`bookmark`, `map.fill`, `person.crop.circle.fill`). Inter 12 on a 16px line. `bg-surface` + `shadow-tab`. Operar badge = danger dot. Desktop web keeps aurora pills in the top nav.

## Screen chrome

`Screen` owns the top safe band and the standard header. Native stack headers stay off (`headerShown: false`).

**Safe band.** A non-scrolling `bg-background` strip equal to `insets.top` on native, or the web tab nav height (`WebNavHeight` / `WebCompactTop`) on tab routes. Scroll content starts **16px** below that band. Title and Volver scroll with the page; they must not travel into the status bar. Do not put `paddingTop: insets.top` on `contentContainerStyle`.

**Volver.** `Screen back` renders `BackBar`: caption 12 uppercase, `← Volver`, hit ≥44px, 16px below the control. Fallback is `router.replace('/')` if there is no history. Do not draw a custom back on stack screens.

**Title.** `Screen title` / `lead` / `eyebrow` / `mark` / `actions` render `PageHeader`. Inter `heading` (28), never Antonio. Lead is `muted`. Use the props — do not compose `BackBar` + `PageHeader` by hand.

```tsx
<Screen back title="Filtros" lead="Nombre, barrio, género o día.">
  {children}
</Screen>
```

**Exceptions (flush / no page title).** Edge-to-edge surfaces skip the band (`flush`) and pad their own overlay with `insets.top`: mapa, puerta, print, onboarding. Event and artist **detail** keep the resource name in the body under the photo; they still use `back`. Explorar has no Inter page title — the search pill is the tab hero.

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
- Drop shadows on top nav, or gradients on chrome. Control lift (`shadow-control` / `shadow-button` / `shadow-focus`) is allowed on chips, buttons, and fields. Card lift (`shadow-card`) and the tab bar lift (`shadow-tab`) stay. Flyer scrim is the only gradient.
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
- [ ] Buttons are pills (`rounded-buttons`); default = inverse `primary` + `shadow-button`; brand highlight = `signal` (aurora + `shadow-signal`)
- [ ] Display type is onboarding / auth / success only
- [ ] Volt/`confirm` is success, not the default chip
- [ ] Aurora marks selected / live / focus / active tab
- [ ] Light and dark both remain readable (toggle + system)
- [ ] New screens use `Screen` props for Volver / title; content does not scroll into the status bar

## Next step

Build screens with `Button` / `Text` / `EventCard` / `SearchBar` in `src/components` and the tokens above. Interaction recipes: [ux.md](ux.md).
