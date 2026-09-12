# Parche UX recipes

Motion, cards, forms, and screen chrome for the Expo app. Visual tokens stay in [design.md](design.md). This file is the interaction layer: how UI moves, how forms fail, and how lists feel.

## Quick path

1. Use `PressScale` and `FadeSlideIn` from `src/components/motion.tsx`. Skip both when reduce-motion is on.
2. Build event photos with `EventCard` (`listing` default, `row` for lists/map). Do not invent extra card layouts. Operar uses `listing` + one primary CTA, not a toolbar of buttons.
3. Create/edit dates with `EventWizard` (Flyer → Datos → Pin → Review) and `StickyCta`. Other forms: `FormSection` + `Field` + one CTA. Errors via `userMessage`. Success is a short confirm flash or helper copy — never a permanently green button.

## Details

| Topic | Decision |
|-------|----------|
| Motion | Reanimated only. Press scale `0.98`. Enter: opacity + 8px translateY. List stagger 40ms. No Moti. |
| Reduce motion | `useReduceMotion()` — if true, render children with no animation. |
| Event card | `listing`: 4:5 photo + Inter meta below. `row`: 64px thumb + Inter. `selected` = `border-foreground`. No third layout. |
| Event wizard | Four steps, eyebrow `N de 4`, sticky Continuar / Atrás. Flyer preview is local until Pin creates the draft (API requires pin or venue). Review is an `EventCard` listing. |
| Role homes | Same five tabs and B/N chrome. Parche and Operar change voice, section order, and primary CTA. Primary profile: promoter > artist > attendee. Operar density follows the event membership role. |
| Labels | Profile and membership chips in Spanish (Asistente, Artista, Organizador, Owner, Manager, Puerta, Métricas). Never raw enums. |
| Staff actions | One primary + overflow `BottomSheet`. Shared helper for Operar and event detail. |
| Confirm green | Success only: print, door approved, brief save confirmation. Not genre tags, not default buttons, not wizard steps, not focused tabs. |
| Buttons | Default filled pill = `bg-primary`. `variant="confirm"` only for the success beat. Logout = `outline` or `destructive`. |
| Search | `SearchBar` pill opens filters. `ChipRow` applies genre/date without leaving the list when possible. |
| Sheets | Map preview and staff overflow use `BottomSheet`. Filters may be a compact stack screen. |
| Detail | Photo hero + Inter title + blocks. Buy lives in `StickyCta`. Staff is a secondary sheet (primary + Más). |
| Forms | Caption uppercase label, optional helper, error = foreground border + helper text. Multiline `minHeight` 96. Hit targets ≥44px. Wizard validates per step. |
| Feedback | Skeleton matches card shape. Empty = `EmptyState` (title + optional lead + action) with role voice. Errors = `ErrorState` with retry on reads. Saving = disable CTA + “Guardando…”. |
| Shell | Stack screens get `BackBar` (44px hit) + compact `PageHeader` (Inter). Guest Parche: CTAs, no empty fake form. |

## Checklist

- [ ] New list uses `FadeSlideIn` with stagger or an explicit skip
- [ ] Genre / role chips are ink or muted, not `confirm`
- [ ] Save / follow / buy / wizard continue primary is `bg-primary` until the action succeeds
- [ ] Light and dark remain readable
- [ ] Keyboard and errors do not hide the form CTA (wizard uses `StickyCta`)
- [ ] Operar and Parche speak to the active profile without a new card layout

## Next step

Implement screens with `Button` / `Field` / `EventCard` / `EventWizard` / `TicketCard` / `ArtistRow` / `SearchBar` / `StickyCta`.
