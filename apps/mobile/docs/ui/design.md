# Parche visual system (app)

Parche is a **consumer, photo-first** UI on the same canvas as the marketing web: soft night (`#07070C`) or cold paper (`#F4F4F7`). Event artwork still leads. **Aurora** (`#B8A4FF`) is the brand spark — selected chips, Live, focus, active tab. The CTA primario is **inverse** (black on light, white on dark). Neon, volt, amber and danger stay signal pigment (map pins, success, wait, stop).

Inter stands in for Favorit (UI + screen titles). Antonio stands in for Foggy on onboarding, auth hero, and success beats (print / door PASA) only.

The OS appearance drives the default scheme (`userInterfaceStyle: automatic`). `ThemeToggle` cycles `system` → `light` → `dark`; `system` live-follows the device, including Control Center, without re-locking `Appearance`. Forced prefs persist in `theme-store`. Stage primitives stay fixed. Semantic tokens (`background`, `foreground`, `surface`, `primary`, `border`) invert. Pigments (`aurora`, `neon`, `volt`, `amber`, `danger`) **do not invert**.

Aligned with `web-frontend/docs/ui/design.md` — same hex roles, same primary/aurora split.

## Quick path

1. Tokens: `src/global.css` (light in `:root`, dark in `.dark` / `prefers-color-scheme`) + runtime vars in `src/lib/theme.ts` (`THEME` / `THEME_VARS`).
2. Style chrome with **semantic** classes (`bg-background`, `bg-surface`, `text-foreground`, `bg-primary`) so both schemes work. Use primitives when the color must stay the same (`bg-aurora`, `bg-neon`, `bg-pitch-black`).
3. JS theme: `useTheme()` and `useResolvedColorScheme()` in `src/hooks/use-theme.ts`. `ThemeRoot` applies `THEME_VARS` + StatusBar.

## Why pigment

Black alone reads as a printer, not a club. Aurora on the stage is what people remember for selection and focus. Neon stays for map / secondary spark. Photos carry the night; chrome carries **Parche**.

## Light vs dark

The system uses multiple surface levels and text weights to create visual hierarchy without relying on pure black/white.

### Surface hierarchy

| Role | Light | Dark | Use |
|------|-------|------|-----|
| Canvas (`background`) | `#F2F2F5` | `#08080D` | Page background |
| Surface (`surface`) | `#FFFFFF` | `#111118` | Cards, containers |
| Sunken (`surface-sunken`) | `#E8E8ED` | `#08080D` | Wells, inset areas |
| Elevated (`surface-elevated`) | `#FFFFFF` | `#1A1A22` | Modals, popovers |
| Raised (`surface-raised`) | — | `#242430` | Prominent elements (dark only) |

### Text hierarchy

| Role | Light | Dark | Use |
|------|-------|------|-----|
| Primary (`foreground`) | `#0B0B12` | `#F5F5F8` | Titles, headings, body |
| Muted (`foreground-muted`) | `#5C5C6E` | `#A0A0B0` | Secondary text, descriptions |
| Subtle (`foreground-subtle`) | `#8A8A9B` | `#6B6B7A` | Captions, timestamps, hints |

### Interactive elements

| Role | Light | Dark |
|------|-------|------|
| Filled pill (`primary`) | `#0B0B12` / label `#F5F5F8` | `#F5F5F8` / label `#0B0B12` |
| Soft fill (`muted`) | `#E8E8EE` / text `#5C5C6E` | `#1C1C25` / text `#A0A0B0` |
| Hairline (`border`) | ink @ 8% | paper @ 10% |
| Strong border (`border-strong`) | ink @ 16% | paper @ 20% |
| Highlight (`aurora` / `ring`) | `#B8A4FF` | same |
| Neon / volt / amber / danger | same hex in both schemes | same |

Icons: `icon-light.png` on light surfaces, `icon.png` on dark. Native splash follows the same split in `app.json`.

## Tokens

### Stage (fixed primitives)

| Role | Value | Tailwind | Use |
|------|-------|----------|-----|
| Ink / dark bands | `#07070C` | `pitch-black` | Dark backgrounds, ink text |
| Paper / inverse text | `#F5F5F8` | `paper-white` | Light surfaces, inverse text |
| Soft fills | `#E8E8EE` | `ash-gray` | Muted backgrounds, wells |
| Selected / pressed light | `#DCDCE4` | `concrete` | Pressed states, selections |
| Nested / muted dark | `#1C1C26` | `charcoal` | Dark mode secondary surfaces |
| Muted copy light | `#5C5C6E` | `slate` | Secondary text on light |
| Tertiary copy | `#6A6A7B` | `graphite` | Captions, hints |
| Helper / disabled | `#8A8A9B` | `stone` | Placeholders, disabled |

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

Cards may use **one** soft lift (`shadow-card` / `cardShadowStyle`). Fields and search use a smaller lift (`shadow-control`); filled CTAs use `shadow-button`; brand highlight uses `shadow-signal`. Focus on fields is an aurora border (plus `shadow-focus` glow); invalid fields use `shadow-error`. Chips stay compact pills — no drop shadow, no scale. The mobile tab bar uses **one** upward lift (`shadow-tab` / `tabBarShadowStyle`) on `bg-surface`. Content chrome: `bg-surface`. No gradients on chrome; flyer scrim is the exception.

## Where pigment goes

| Surface | Token |
|---------|-------|
| Default filled button | `primary` → inverse ink/paper |
| Brand / highlight pill | `signal` → `aurora`, black label |
| Outlined / ghost | ink (`foreground` / `border`) |
| Selected chip / filter | `aurora` fill, black label |
| Idle chip | `muted` + foreground label |
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
- **Event card (listing):** square flyer + meta **under** the photo (Airbnb catalog). White pill on the photo for badges like “Esta noche”, save heart top-right (44px hit; tap does not open detail). Phone: title 16/700 two lines; muted line is venue · date · ALL NIGHT/hora. Desktop web: title + genre (uppercase, right) + place + `17 de sept`; heart sits on a white circle. Rails show **2 cards + peek** (~168px) on phone and fill the row on desktop (up to ~320px). Phone lists are a **2-column** catalog (`EventFeed` / `EventGrid`). Desktop web grids **fill the page** (`minmax(260px, 1fr)`). Wallet is a pass deck grouped by event, not that grid. No glass overlay on listing photos. Dense staff lists may still use `row` (`bg-surface`). `poster` uses the same catalog card. `selected` = aurora border on the flyer.
- **Event detail:** facts in two muted cards (Cuándo / Dónde). Stages are tappable price cards, not a muted list. Sticky CTA is **Comprar boletas** with “Desde $X”; if ≤12 left, show remaining in amber. Wide web pins the buy card at the top of the copy column.
- **Ticket pass (wallet):** compact square flyer in a full-bleed rail (~168px, 2 + peek) to the screen edge. One card per event. Count under the flyer `3 disponibles · 0 usadas`. Tap opens the passes; swipe between boletas of that event. No Mostrar button. Grayscale only when the event has no available tickets.
- **Collection tile (Favoritos):** square photo `rounded-images` + title 16/700 + muted count/time **under** the photo. 2-column grid on phone. **Vistos recientemente** is a 2×2 flyer collage; city/year and artists use a single cover. Not an `EventCard`. Edita is a muted sentence-case pill in `headerAction`, not a filled CTA.
- **Search:** pill “¿Qué parche buscas?” is the Explorar hero on phone (`bg-surface`, `shadow-control`). Horizontal chips with icon: Todo + day windows + genres. Desktop web uses an Airbnb capsule (Buscar + Fechas) and **category** chips (icon over label, underline when selected — not aurora fill). No Inter page title on the tab.
- **Hero (auth / onboarding):** Antonio display type is allowed. Event detail uses a flush flyer with overlay chrome; Inter title lives in the overlapping `surface` sheet, not on the photo.
- **Dark band:** full-bleed `pitch-black`. Use for auth/onboarding, not for every page header.
- **Flyer scrim:** the only allowed gradient. It sits on event artwork when a poster overlay is needed, never on chrome.
- **Tab bar (mobile):** custom JS chrome in `TabBar` / `TabBarItem`. Equal `flex: 1` cells. Icon well 32px, glyph 28px medium. Idle = outline; selected = fill + aurora (`bookmark`, `map.fill`, `person.crop.circle.fill`). Inter 12 on a 16px line. `bg-surface` + `shadow-tab`. Operar badge = danger dot. Desktop web keeps aurora pills in a top nav that sits in document flow (not overlaid on the page).

## Screen chrome

`Screen` owns the top safe band and the standard header. Native stack headers stay off (`headerShown: false`).

**Safe band.** A non-scrolling `bg-background` strip equal to `insets.top` on native, or `WebCompactTop` on compact web tab routes. Desktop web keeps the tab nav **in document flow** (not overlaid), so `Screen` does not add `WebNavHeight`. Scroll content starts **16px** below that band. Title and Volver scroll with the page, except Operar (title + search stay in `stickyHeader`). They must not travel into the status bar. Do not put `paddingTop: insets.top` on `contentContainerStyle`.

**Sticky chrome.** `Screen stickyHeader` sits under the safe band and does not scroll. Explorar uses it for SearchBar + chips (phone) or the Buscar/Fechas capsule + category chips (desktop). Operar uses it for **Operar** + SearchBar + group chips. Map mode pins the same hero above the map/sheet.

**Volver.** `Screen back` renders `BackBar`: caption 12 uppercase, `← Volver`, hit ≥44px, 16px below the control. Fallback is `router.replace('/')` if there is no history. Do not draw a custom back on stack screens, except the event-detail flyer overlay (circular `paper-white` chevron, hit 44px).

**Title.** `Screen title` / `lead` / `eyebrow` / `mark` / `actions` / `headerAction` render `PageHeader`. Inter `heading` (28), never Antonio. Lead is `muted`. `headerAction` sits on the right of the title row (44px icon control — theme toggle on Parche; **Edita** muted pill on Favoritos). `actions` stay below the title for page CTAs. Use the props — do not compose `BackBar` + `PageHeader` by hand. Operar is the exception: title + search + group chips go in `stickyHeader` so the hub filter stays on screen while the catalog scrolls.

```tsx
<Screen back title="Filtros" lead="Nombre, barrio, género o día.">
  {children}
</Screen>
```

**Exceptions (flush / no page title).** Edge-to-edge surfaces skip the solid band (`flush`) and pad their own overlay with `insets.top`: mapa, puerta, print, onboarding, **event detail (compact)**. Compact event detail pins the flyer and lets only the `surface` sheet scroll, docking flush under the overlay chrome (no gap) while keeping the top `navelements` radius. A dissolving dark frost on the flyer keeps the notch readable. Compact event detail draws Volver / compartir / guardar on the flyer; the event name stays in the body sheet under the photo. Wide event detail and artist detail still use `Screen back`. Explorar has no Inter page title — the search pill is the tab hero and stays pinned with the chips.

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
- Drop shadows on top nav or on chips, or gradients on chrome. Control lift (`shadow-control` / `shadow-button` / `shadow-focus`) is for fields and buttons. Card lift (`shadow-card`) and the tab bar lift (`shadow-tab`) stay. Flyer scrim is the only gradient.
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
