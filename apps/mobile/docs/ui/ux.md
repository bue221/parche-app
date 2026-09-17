# Parche UX recipes

Motion, cards, forms, and screen chrome for the Expo app. Visual tokens stay in [design.md](design.md). This file is the interaction layer: how UI moves, how forms fail, and how lists feel.

## Quick path

1. Use `PressScale` and `FadeSlideIn` from `src/components/motion.tsx`. Skip both when reduce-motion is on.
2. Build event photos with `EventCard` (`listing` default, `row` for lists/map). Do not invent extra card layouts. Operar uses `listing` + one primary CTA, not a toolbar of buttons.
3. Create/edit dates with `EventWizard` (Flyer → Datos → Pin → Review) and `StickyCta`. Other forms: `FormSection` + `Field` + one CTA. Errors via `userMessage`. Success is a short confirm flash or helper copy — never a permanently green button.

## Details

| Topic | Decision |
|-------|----------|
| Motion | Reanimated only. Press scale `0.98`. Enter: opacity + translateY, ~360ms. List stagger 40ms. No Moti. |
| Reduce motion | `useReduceMotion()` — if true, render children with no animation. |
| Event card | `listing`: 4:5 photo + date badge + Inter meta below. `row`: 64px thumb + Inter on `bg-surface`. Featured rails use existing `poster`. `selected` = aurora border. |
| Ticket card | Pass: 16:10 photo + estado + Mostrar. Phone full-width. Desktop web `TicketFeed` 280–400px. Do not stretch to page max. |
| Event wizard | Four steps, eyebrow `N de 4`, sticky Continuar / Atrás. Flyer preview is local until Pin creates the draft (API requires pin or venue). Review is an `EventCard` listing. |
| Role homes | Same tabs and soft canvas. Labels **Guardados** and **Cuenta** never change with session. Aurora marks the active tab; inverse `primary` is the conversion CTA. Cuenta and Operar change voice, section order, and primary CTA. Identity mark next to **Cuenta**: Tucán / Cóndor / Jaguar. No color skin. Primary profile: promoter > artist > attendee. Operar density follows the event membership role. Badge on Operar for tonight / pending invite. |
| Labels | Profile and membership chips in Spanish (Asistente, Artista, Organizador, Owner, Manager, Puerta, Métricas). Never raw enums. |
| Staff actions | One primary + overflow `BottomSheet`. Shared helper for Operar and event detail. |
| Confirm / volt | Success only: print, door approved, brief save confirmation, valid ticket. Not idle genre tags, not wizard steps at rest. |
| Buttons | Default filled pill = `bg-primary` (inverse). `variant="signal"` = aurora. `variant="confirm"` only for the success beat. Logout = `destructive` (danger). |
| Search | `SearchBar` pill opens filters. `ChipRow` applies genre/date without leaving the list when possible. |
| Sheets | Map preview, staff overflow, and AuthSheet (OTP/Google) use `BottomSheet`. Filters may be a compact stack screen. Auth de compra no es una ruta full-screen. |
| Detail | Photo hero + Inter title + blocks. Buy lives in `StickyCta`. Staff is a secondary sheet (primary + Más). |
| Forms | Caption uppercase label, optional helper, error = danger border + helper text. Focus = aurora border. Multiline `minHeight` 96. Hit targets ≥44px. Wizard validates per step. `Screen` scrolls the focused field above the keyboard; `StickyCta` stays visible. |
| Feedback | Skeleton matches card shape. Empty = `EmptyState` (title + optional lead + action) with role voice. Errors = `ErrorState` with retry on reads. Saving = disable CTA + “Guardando…”. |
| Shell | Stack screens get `BackBar` (44px hit) + compact `PageHeader` (Inter). Guest Cuenta: value card + AuthSheet CTA + theme. Password login remains a dismissible modal for existing accounts. |
| Theme | `ThemeToggle` forces light/dark; default follows system. Always resolve via `useResolvedColorScheme()` — never raw `Appearance` alone for chrome colors. |

## Checklist

- [ ] New list uses `FadeSlideIn` with stagger or an explicit skip
- [ ] Genre chips at rest are muted; selected chips use `aurora`
- [ ] Save / follow / buy / wizard continue primary is `bg-primary` (inverse) until the action succeeds
- [ ] Light and dark remain readable after toggle and system changes
- [ ] Keyboard and errors do not hide the form CTA (wizard uses `StickyCta`)
- [ ] Operar and Parche speak to the active profile without a new card layout

## Next step

Implement screens with `Button` / `Field` / `EventCard` / `EventWizard` / `TicketCard` / `ArtistRow` / `SearchBar` / `StickyCta`.
