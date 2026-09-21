# Parche UX recipes

Motion, cards, forms, and screen chrome for the Expo app. Visual tokens stay in [design.md](design.md). This file is the interaction layer: how UI moves, how forms fail, and how lists feel.

## Quick path

1. Use `PressScale` and `FadeSlideIn` from `src/components/motion.tsx`. Skip both when reduce-motion is on.
2. Build event photos with `EventCard` (`listing` default catalog card, `row` only for dense staff lists). Favoritos uses `CollectionCard` tiles, not a feed of event cards. Operar uses `listing` cards; tap opens the operate desk. No Editar/Más on the hub. Promoter create is a fixed FAB, not a header button.
3. Create/edit dates with `EventWizard` (Fotos → Datos → Pin → Review) and `StickyCta`. Other forms: `FormSection` + `Field` + one CTA. Errors via `userMessage`. Success is a short confirm flash or helper copy — never a permanently green button.

## Details

| Topic | Decision |
|-------|----------|
| Motion | Reanimated only. Press scale `0.98`. Enter: opacity + translateY, ~360ms. List stagger 40ms. No Moti. |
| Reduce motion | `useReduceMotion()` — if true, render children with no animation. |
| Event card | `listing`: square flyer, badge + heart on the photo, title and venue · date · ALL NIGHT **under** the image on phone. Desktop listing is title + genre, place, `17 de sept`. Rails are compact on phone (2 + peek, ~168px) and fill the row on desktop (up to ~320px). Phone lists are a **2-column** catalog (`EventFeed` / `EventGrid`). Desktop web grids fill the page (`minmax(260px, 1fr)`). Explorar listing may show a 44px save heart on the flyer (tap does not open detail). `row`: 64px thumb + Inter on `bg-surface` for dense staff lists only. Rails are full-bleed like chips. `poster` is the same card. `selected` = aurora border on the flyer. |
| Collection tile | Favoritos board only. Square cover + title + muted subtitle. Recents = 2×2 collage. City/year and artists = single cover. Edita/Listo muted pill. Inner list uses `EventCard` in the same 2-column catalog. |
| Ticket card | Compact rail card (~168px), full-bleed to the screen edge (including wide web). One card per event. Count under the flyer (`3 disponibles · 0 usadas`). Tap opens that event’s passes — no Mostrar button. Used/cedido only grayscale the flyer when nothing is left to show. |
| Event wizard | Four steps, eyebrow `N de 4`, sticky Continuar / Atrás. Step 1 is flyer 4:5 plus optional gallery thumbs (add/remove). Flyer preview is local until Pin creates the draft (API requires pin or venue). Extra photos upload as `gallery` after the draft exists. Review is an `EventCard` listing. |
| Role homes | Same tabs and soft canvas. Labels **Favoritos** and **Cuenta** never change with session. Aurora marks the active tab; inverse `primary` is the conversion CTA. Cuenta is an identity card + two shortcut tiles + one CTA, then settings rows — not a flat dump of eventos or following. Identity mark next to **Parche**: Tucán / Cóndor / Jaguar. No color skin. Primary profile: promoter > artist > attendee. Operar density follows the event membership role. Badge on Operar for tonight / pending invite. |
| Labels | Profile and membership chips in Spanish (Asistente, Artista, Organizador, Owner, Manager, Puerta, Métricas). Never raw enums. Product nouns: **evento** (not fecha), **artistas** (not lineup), **etapas** (not tipos de boleta). Keep **Fecha y hora** for the datetime field and **boleta** for the pass. |
| Staff actions | Hub is catalog only. Sticky `PageHeader` + search + group chips (`Esta semana` / `Más adelante` / `Borradores` / `Finalizados`). Operate desk (`/event/[id]/operate`) shows one primary CTA by role and the rest as visible `SettingsRow`s. Shared helper `buildEventStaffActions`. Past events stay visible as consult: metrics, occupancy, lineup, ticket stages, and staff — no edit, setup, or door scan. |
| Confirm / volt | Success only: print, door approved, brief save confirmation, valid ticket. Not idle genre tags, not wizard steps at rest. |
| Buttons | Default filled pill = `bg-primary` (inverse) + `shadow-button`. Press scale `0.98` is built into `Button`. `variant="signal"` = aurora + `shadow-signal`. `variant="confirm"` only for the success beat. Logout = `destructive` (danger). Phone FABs (`MapToggleFAB`, `CreateEventFab`) are 56px pills, bottom-right above the tab bar. Web Explorar uses the marketing map pill: centered **Mostrar mapa** / **Mostrar lista**, 16px icon, not the 56px app FAB. |
| Search | `SearchBar` pill is the Explorar hero on phone (no tab page title) and stays pinned with the chips via `Screen stickyHeader`. Desktop Explorar uses `ExploreDesktopHero`: Buscar + Fechas capsule and category chips (underline, not aurora fill). On Operar a **compact** 44px pill sits under a pinned **Operar** title (`onChangeText`) with group chips, also in `stickyHeader`. Icon sits in a muted well; the pill uses `shadow-control`. `ChipRow` chips may include a Lucide icon; Todo + day/genre apply without leaving the list. The row is full-bleed to the screen edge (first chip aligns with the SearchBar). Idle = `muted`. Selected = `aurora` on phone pills; desktop category chips use a `foreground` underline. Chips must `fit` (no `w-full`) so they do not stretch on web. |
| Sheets | Map sheet: collapsed handle + count, peek list, expand to cover, **Mapa** pill returns to collapsed. AuthSheet is a dismissible page modal (logo, email, Continuar, Google icon). It opens at boot for guests after onboarding. Filters may be a compact stack screen. Auth de compra no es una ruta full-screen. |
| Detail | Flush flyer + overlay chrome (Volver, share, save heart; Escuchar if tracks; **N fotos** if gallery). Compact flyer stays pinned; only the white sheet scrolls, docking flush under the chrome with the top radius kept. Dissolving dark frost over the notch. Tap flyer or a gallery thumb to open a full-screen viewer (`contain`, swipe, close). Inter title, Cuándo/Dónde fact cards, artist avatars, about, address/map in an overlapping `surface` sheet. Stages are tappable price cards. Buy lives in `StickyCta` as **Comprar boletas** + “Desde $X”; wide web pins that card at the top of the copy. Ended nights show **Finalizado** instead of Comprar. Staff gets outline “Operar este evento”; tools live on the operate desk, not on the public ficha. |
| Forms | Caption uppercase label (aurora when focused, danger when invalid), optional helper, error = danger border + `shadow-error` + helper text. Focus = aurora border + `shadow-focus`. Multiline `minHeight` 96. Hit targets ≥44px. Wizard validates per step. `Screen` scrolls the focused field above the keyboard; `StickyCta` stays visible. |
| Feedback | Skeleton matches card shape. Empty = `EmptyState` (title + optional lead + action) with role voice. Rails use `compact` so Esta noche / Para ti keep their title when there are no cards. Errors = `ErrorState` with retry on reads. Saving = disable CTA + “Guardando…”. |
| Shell | `Screen` owns the safe band + `BackBar` / `PageHeader` (see [design.md](design.md) Screen chrome). Mobile tabs: equal-width `TabBar` cells, 26px glyphs in a 32px well, Inter 12. Guest launch: AuthSheet page modal (X to skip). Guest Cuenta: value card + AuthSheet CTA + theme. Password login remains a dismissible modal for existing accounts. |
| Theme | `ThemeToggle` cycles system → light → dark. Default and `system` live-follow the iPhone/Android appearance (Control Center included). Do not re-apply `Appearance.setColorScheme` on every scheme change. Always resolve via `useResolvedColorScheme()`. |

## Checklist

- [ ] New list uses `FadeSlideIn` with stagger or an explicit skip
- [ ] Genre chips at rest are muted; selected phone chips use `aurora`; desktop category chips use an underline; chips do not stretch on web
- [ ] Save / follow / buy / wizard continue primary is `bg-primary` (inverse) until the action succeeds
- [ ] Light and dark remain readable after toggle and system changes
- [ ] Keyboard and errors do not hide the form CTA (wizard uses `StickyCta`)
- [ ] Operar and Parche speak to the active profile without a new card layout

## Next step

Implement screens with `Button` / `Field` / `EventCard` / `CollectionCard` / `EventWizard` / `TicketEventCard` / `TicketPassPager` / `ArtistRow` / `SearchBar` / `StickyCta`.
