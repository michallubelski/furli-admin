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
