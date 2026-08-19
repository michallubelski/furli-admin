# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- Initial extraction of the admin panel from `furli-fronted` into its own standalone repository.
- Flattened admin routing (no `/admin/**` prefix - this app mounts the same route tree at the
  domain root): `/dashboard`, `/verification`, `/providers`, `/subscriptions`, `/reviews`,
  `/reports`, `/api-integrations`, `/analytics`, `/communication`, `/settings`, `/admins`.
- Standalone, single-role authentication (`AdminSession`, `POST /api/admin/auth/login`,
  `POST /api/admin/auth/logout`) replacing the provider/admin role-fallback login used in
  `furli-fronted`.
- Trimmed shared UI kit, theme tokens, icon set, i18n engine, and `common`/`auth`/`admin` locale
  files, copied from `furli-fronted` and scoped to what the admin panel actually uses.
- Docker/nginx production setup (multi-stage build, SPA fallback, gzip, security headers, HTTP
  Basic Auth preview gate) mirroring `furli-fronted`'s pattern, on Vite dev port `5175` and intended
  production domain `admin.furliplus.pl`.
- Mobile layout, ported from `furli-admin-v6.jsx` (mockup `v44`): global `@media (max-width: 860px)`
  rules (grid collapse, horizontally-scrolling tables, modal-to-bottom-sheet, 16px form fields to
  avoid iOS zoom-on-focus, 38px minimum tap targets), plus a dedicated bottom tab bar (Pulpit ·
  Kolejka · Placówki · Więcej) with a new `/more` screen replacing the old hamburger/drawer nav on
  narrow screens - the sidebar is desktop-only now.
- `ProvidersPage`'s facility list rebuilt around the mockup's 7-tab lifecycle model (Zarejestrowane
  → Opublikowane → W okresie próbnym → W okresie karencji → Zawieszone / Odrzucone / Wygasłe, with
  sub-filters on Opublikowane/Wygasłe), driven by the backend's already-existing derived
  `billing.phase` (onboarding/trial/grace/dormant/active/past_due/canceled) instead of the flat
  trial/active/overdue status. The "Zarejestrowane" tab shows a profile-completeness progress bar.
- `ProviderDetailsModal` shows a "profile incomplete — approval is blocked" banner for a
  not-yet-published provider, backed by the same publish-readiness data.
- Backend: `GET /api/admin/providers` and `GET /api/admin/providers/{id}` (`ProviderAccountResponse`)
  now include a `publishReadiness` field (ready/pct/done/total/missing), reusing the existing
  `PublishReadinessService.compute(account)` - computed only for a not-yet-published account
  (draft/pending/changes_requested) to avoid an extra per-row staff query for every other provider.

### Fixed
- A report moved to `investigating` no longer disappears from both the Kolejka decision queue and
  the Zgłoszenia "Otwarte" tab - both now treat it the same as `open` (only `resolved` drops out).
# 2026-08-19

- Fixed the provider preview crashing the whole admin panel for incomplete or previously cached provider records. Provider completeness and optional list fields are now normalized and rendered defensively when absent.
