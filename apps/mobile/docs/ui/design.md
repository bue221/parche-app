# Parche visual system

Parche is a **consumer, photo-first** UI on a monochrome chrome: black ink on white paper in light mode, inverted in dark mode. Event artwork carries the color. The only extra pigment is neon-green confirmation (`confirm`), which does not change with scheme.

Inter stands in for Favorit (UI). Antonio stands in for Foggy, and only appears on onboarding, auth hero, and success beats (print / door PASA).

The OS appearance drives the scheme (`userInterfaceStyle: automatic`). Primitives (`pitch-black`, `paper-white`, grays) stay fixed. Semantic tokens (`background`, `foreground`, `primary`, `border`) invert.

## Quick path

1. Read tokens in `src/global.css` (light in `:root`, dark in `.dark`) and `tailwind.config.js`.
2. Style chrome with **semantic** classes (`bg-background`, `text-foreground`, `bg-primary`) so both schemes work. Use primitives only when the color must stay the same in both modes.
3. JS/theme surfaces: `useTheme()` and `useResolvedColorScheme()` in `src/hooks/use-theme.ts`.

## Light vs dark

| Role | Light | Dark |
|------|-------|------|
| Canvas (`background`) | `#ffffff` | `#000000` |
| Text (`foreground`) | `#000000` | `#ffffff` |
| Filled pill (`primary`) | black fill, white label | white fill, black label |
| Outlined pill | black border/text | white border/text |
| Soft fill (`muted`) | `#eeeeee` | `#333333` |
| Hairline (`border`) | `#d9d9d9` | `#333333` |
| Muted copy | `#595959` | `#808080` |
| Confirm | `#7ffeb1` | `#7ffeb1` |

Icons: `icon-light.png` on light surfaces, `icon.png` on dark. Native splash follows the same split in `app.json`.

## Tokens

| Role | Value | Tailwind |
|------|-------|----------|
| Text / filled actions / dark bands | `#000000` | `pitch-black` |
| Canvas / inverse text | `#ffffff` | `paper-white` |
| Soft fills | `#eeeeee` | `ash-gray` |
| Hairlines / inputs | `#d9d9d9` | `concrete` |
| Secondary dark / nested copy | `#333333` | `charcoal` |
| Muted copy | `#595959` | `slate` |
| Helper / disabled | `#808080` | `stone` |
| Success screen only | `#7ffeb1` | `confirm` |

Type scale: `caption` 12, `body-sm` 14, `body` 16, `subheading` 18, `heading-sm` 24, `heading` 28, `display` 106 / 0.83. UI tracking is `0.06em` (`tracking-favorit`). Weights: 300 (quiet), 400, 700. Do not use 500/600.

Screen titles use Inter `heading` (24/28), not Antonio.

Spacing base is 4px (`ds-4` … `ds-120`). Page max width is 1200px. Section padding is 80px (`ds-80`).

| Shape | Radius | Class |
|-------|--------|--------|
| Tags | 100px | `rounded-tags` |
| Cards / images | 16px | `rounded-cards` / `rounded-images` |
| Small | 4px | `rounded-sm` |
| Nav | 20px | `rounded-navelements` |
| Buttons | 40px | `rounded-buttons` |

Cards may use **one** soft lift (`shadow-card` / `cardShadowStyle`). No gradients on chrome.

## Components

- **Filled pill:** `bg-primary` + `text-primary-foreground`, all-caps 12/700, 22×12 padding, 40px radius. Inverts with scheme. Default `Button` uses this — not `confirm`.
- **Outlined pill:** 1px `border-foreground` on `background`; same inversion.
- **Event card (listing):** 4:5 photo, 16px radius, title / date / venue **below** the image. Default on Agenda. Dense lists and map use `row`. `poster` (scrim + display type) is not the default.
- **Search:** pill “¿Qué parche buscas?” plus horizontal genre/date chips.
- **Hero (auth / onboarding):** stacked display type is allowed. Event detail uses Inter title under a photo hero.
- **Dark band:** full-bleed `pitch-black` (always black). Use for auth/onboarding, not for every page header.
- **Flyer scrim:** the only allowed gradient. It sits on event artwork when a poster overlay is needed, never on chrome.

## Do

- Keep chrome black / white / gray.
- Let the photo lead; type follows.
- Build chrome with semantic tokens so light and dark both work.
- Use Inter for screen titles.

## Don't

- Color on buttons, borders, or text tokens (except `confirm` on success screens).
- Drop shadows or gradients on nav, buttons, or tab chrome (card lift is the exception).
- Antonio/Foggy on tab titles, cards, or forms.
- Sharp or lightly rounded buttons.

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
- [ ] Buttons are pills (`rounded-buttons`) and use `primary` / `foreground`, not hardcoded black/white
- [ ] Display type is onboarding / auth / success only
- [ ] Confirm green is not in chrome (tabs, default buttons, genre tags)
- [ ] Light and dark both remain readable

## Next step

Build screens with `Button` / `Text` / `EventCard` / `SearchBar` in `src/components` and the tokens above.
