# Parche visual system (web)

Parche uses a monochrome gig-flyer UI: black ink on white paper in light mode, inverted in dark mode. Color stays inside event artwork and one neon-green confirmation token (`confirm`), which does not change with scheme.

This web app ports the same tokens as `app-frontend`. Inter stands in for Favorit (UI). Antonio stands in for Foggy (hero only).

The OS appearance drives the scheme. Primitives (`pitch-black`, `paper-white`, grays) stay fixed. Semantic tokens (`background`, `foreground`, `primary`, `border`) invert.

## Quick path

1. Tokens live in `src/app/globals.css` (`:root` light, dark via `prefers-color-scheme` and `.dark`).
2. Style chrome with **semantic** classes (`bg-background`, `text-foreground`, `bg-primary`) so both schemes work.
3. Use primitives only when the color must stay the same in both modes (`bg-pitch-black` for dark bands).
4. Build screens with `Button` / `Text` / `Tag` in `src/components/ui`.

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

Type scale: `caption` 12, `body-sm` 14, `body` 16, `subheading` 18, `heading-sm` 24, `heading` 28, `display` clamp 80–106 / 0.83. UI tracking is `0.06em` (`tracking-favorit`). Weights: 300 (quiet), 400, 700. Do not use 500/600.

Spacing base is 4px (`ds-4` … `ds-120`). Page max width is 1200px. Section padding is 80px (`ds-80`).

| Shape | Radius | Class |
|-------|--------|--------|
| Tags | 100px | `rounded-tags` |
| Cards / images | 8px | `rounded-cards` / `rounded-images` |
| Small | 4px | `rounded-sm` |
| Nav | 20px | `rounded-navelements` |
| Buttons | 40px | `rounded-buttons` |

## Components

- **Filled pill:** `bg-primary` + `text-primary-foreground`, all-caps 12/700, 22×12 padding, 40px radius. Inverts with scheme.
- **Outlined pill:** 1px `border-foreground` on `background`; same inversion.
- **Event card:** 8px poster, no shadow, 8px type gap under the image.
- **Hero:** stacked Antonio display, Inter 18 muted copy, filled CTA.
- **Dark band:** full-bleed `pitch-black` (always black), 80px+ vertical padding, white type.

## Do

- Keep chrome black / white / gray.
- Stack display headlines; never use Foggy/Antonio under ~80px.
- Alternate white sections and black bands in light; invert that rhythm in dark.
- Build chrome with semantic tokens so light and dark both work.

## Don't

- Color on buttons, borders, or text tokens (except `confirm` on success screens).
- Drop shadows or gradients on UI.
- Sharp or lightly rounded buttons.

## Checklist

- [ ] New UI uses Parche tokens, not default Next blue
- [ ] Buttons are pills (`rounded-buttons`) and use `primary` / `foreground`
- [ ] Display type is hero-only
- [ ] Confirm green is not in chrome
- [ ] Light and dark both remain readable

## Next step

Preview primitives at `/sistema` (noindex). Landing composition lives in `src/components/landing`.
