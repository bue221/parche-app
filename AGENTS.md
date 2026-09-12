# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

This project uses **pnpm only**. Do not run `npm`, `yarn`, or `bun` for installs or scripts. Use `pnpm install`, `pnpm add`, and `pnpm <script>`.

## Project rules live in `docs/`

Treat `docs/` as the source of truth for product, UI, and architecture rules. Read the matching file before changing that area.

**Always index new docs.** Any new or moved file under `docs/` must be linked in [docs/README.md](docs/README.md) and in the table below in the same change. Do not leave undocumented files in `docs/`.

| Path | Covers |
|------|--------|
| [docs/README.md](docs/README.md) | Index of all project rule docs |
| [docs/product/prd.md](docs/product/prd.md) | App product: features, personas, sprints, QR/door, navigation |
| [docs/features/README.md](docs/features/README.md) | Catalog of atomic screen/flow specs (`feat-001` … `feat-036`) |
| [docs/features/feat-001-shell-navigation.md](docs/features/feat-001-shell-navigation.md) | Tabs and stacks |
| [docs/features/feat-002-auth-register.md](docs/features/feat-002-auth-register.md) | Register |
| [docs/features/feat-003-auth-login.md](docs/features/feat-003-auth-login.md) | Login |
| [docs/features/feat-004-auth-session.md](docs/features/feat-004-auth-session.md) | Session refresh/logout |
| [docs/features/feat-005-agenda.md](docs/features/feat-005-agenda.md) | Agenda list |
| [docs/features/feat-006-explore-map.md](docs/features/feat-006-explore-map.md) | Explore map |
| [docs/features/feat-007-event-detail.md](docs/features/feat-007-event-detail.md) | Event detail |
| [docs/features/feat-008-event-create.md](docs/features/feat-008-event-create.md) | Create event |
| [docs/features/feat-009-event-edit.md](docs/features/feat-009-event-edit.md) | Edit event |
| [docs/features/feat-010-media-upload.md](docs/features/feat-010-media-upload.md) | Presigned media |
| [docs/features/feat-011-map-pin.md](docs/features/feat-011-map-pin.md) | Organizer map pin |
| [docs/features/feat-012-profile-me.md](docs/features/feat-012-profile-me.md) | Me profile |
| [docs/features/feat-013-artist-edit.md](docs/features/feat-013-artist-edit.md) | Edit artist |
| [docs/features/feat-014-artist-public.md](docs/features/feat-014-artist-public.md) | Public artist |
| [docs/features/feat-015-event-lineup.md](docs/features/feat-015-event-lineup.md) | Lineup |
| [docs/features/feat-016-artist-follow.md](docs/features/feat-016-artist-follow.md) | Follow artist |
| [docs/features/feat-017-event-tracks.md](docs/features/feat-017-event-tracks.md) | Event audio |
| [docs/features/feat-018-event-members.md](docs/features/feat-018-event-members.md) | Event staff |
| [docs/features/feat-019-invite-accept.md](docs/features/feat-019-invite-accept.md) | Accept invite |
| [docs/features/feat-020-ticket-types.md](docs/features/feat-020-ticket-types.md) | Ticket types |
| [docs/features/feat-021-ticket-purchase.md](docs/features/feat-021-ticket-purchase.md) | Purchase |
| [docs/features/feat-022-order-return.md](docs/features/feat-022-order-return.md) | Payment return |
| [docs/features/feat-023-ticket-print.md](docs/features/feat-023-ticket-print.md) | Thermal print animation for ticket issuance |
| [docs/features/feat-024-ticket-wallet.md](docs/features/feat-024-ticket-wallet.md) | Ticket wallet |
| [docs/features/feat-025-ticket-qr.md](docs/features/feat-025-ticket-qr.md) | Show QR |
| [docs/features/feat-026-ticket-transfer.md](docs/features/feat-026-ticket-transfer.md) | Transfer ticket |
| [docs/features/feat-027-operate-hub.md](docs/features/feat-027-operate-hub.md) | Operate hub |
| [docs/features/feat-028-door-scanner.md](docs/features/feat-028-door-scanner.md) | Door scanner |
| [docs/features/feat-029-door-live.md](docs/features/feat-029-door-live.md) | Live occupancy |
| [docs/features/feat-030-event-metrics.md](docs/features/feat-030-event-metrics.md) | Event metrics |
| [docs/features/feat-031-admin-approval.md](docs/features/feat-031-admin-approval.md) | Admin approval |
| [docs/features/feat-032-search-filters.md](docs/features/feat-032-search-filters.md) | Search filters |
| [docs/features/feat-033-recommendations.md](docs/features/feat-033-recommendations.md) | Recommendations |
| [docs/features/feat-034-editorial-posts.md](docs/features/feat-034-editorial-posts.md) | Editorial deferred (future web blog) |
| [docs/features/feat-035-deep-links.md](docs/features/feat-035-deep-links.md) | Deep links |
| [docs/features/feat-036-device-permissions.md](docs/features/feat-036-device-permissions.md) | Device permissions |
| [docs/ui/design.md](docs/ui/design.md) | Visual system: light/dark tokens, type, components, assets |
| [docs/ui/ux.md](docs/ui/ux.md) | Motion, cards, forms, feedback, shell hit targets |
