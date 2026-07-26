# Furli Admin

Standalone admin panel for FURLI, built with React, TypeScript, and Vite. Extracted from
`furli-fronted` (see `CHANGELOG.md`) so the admin panel and the provider business portal can be
deployed, versioned, and scaled independently.

This repo is admin-only - there is no provider or end-user functionality here. The provider portal
lives in the sibling `furli-fronted` repo, at `biz.furliplus.pl`.

The project has two primary runtime modes:
- local development with the Vite dev server,
- production build served by `nginx` inside Docker.

In production:

```text
browser -> nginx-proxy container (TLS, admin.furliplus.pl, furli-infra) -> furli-admin container (:80, nginx, via furli-net) -> furli-backend (:8080) for /api/admin/**
```

The reverse-proxy layer (TLS termination, domain routing) lives in the separate `furli-infra` repo,
not here. This repo only defines the app container itself: `docker/docker-compose.yml`. It talks to
`nginx-proxy` over a shared Docker network (`furli-net`) by container name rather than through a
published host port.

## Stack

- React 18
- TypeScript 5
- Vite 5
- nginx 1.27 (production runtime)
- Docker / Docker Compose

Same stack and tooling conventions as `furli-fronted` (no ESLint/Prettier config in either project
today - only `.editorconfig`).

## Requirements

### Local development

- Node.js 20+
- npm 10+

### Docker runtime

- Docker
- Docker Compose

## Routing

Single-role SPA, no route-space prefix (unlike `furli-fronted`'s `/admin/**`, since this app *is*
the admin panel):

- `/login`
- `/dashboard`
- `/verification`
- `/providers` (supports `?providerId=<id>` to open the provider detail modal while keeping list/filter/scroll state)
- `/subscriptions`
- `/reviews`
- `/reports`
- `/api-integrations`
- `/analytics`
- `/communication`
- `/settings`
- `/admins`

Frontend routing is used for UX only - each view has its own URL, refresh keeps the current page,
and backend authorization remains the source of truth.

## Internationalization and localization

Same i18n engine as `furli-fronted` (`src/shared/i18n`), trimmed to the domains this app actually
needs:

- supported locales: `pl-PL` and `en-US`,
- browser language detection on first visit, fallback to `pl-PL`,
- locale persistence in local storage under `furli.locale`,
- `useI18n()` for translation access and locale-aware formatting,
- a shared `LanguageSwitcher` component.

Locale domain files: `common.ts`, `auth.ts`, `admin.ts` (no `provider`/`appointments`/`services`/
`settings` domains - those are provider-only and stayed in `furli-fronted`).

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create your local environment file:

```bash
cp .env.template .env.local
```

3. Configure the backend target for development:

```env
VITE_API_PROXY_TARGET=http://localhost:8080
```

With this setting, the app calls `/api/admin/...`, and Vite forwards that traffic to the local
backend.

4. Start the development server:

```bash
npm run dev
```

5. Open:

```text
http://localhost:5175
```

## Environment variables

- `.env.template` - template for development,
- `.env.local` - local developer configuration,
- `.env.production` - values used during the Docker image build.

`VITE_API_PROXY_TARGET`
- used only in development by Vite,
- proxies `/api/...` requests to the backend, e.g. `http://localhost:8080`.

`VITE_API_BASE_URL`
- optional direct backend base URL used by the browser,
- when empty, the app uses the current host and relative paths.

## Available scripts

```bash
npm run dev
npm run build
npm run preview
npm run test
```

`npm run dev` - starts Vite in development mode on port `5175` (`strictPort: true` - fails fast
instead of silently moving to another port, which would otherwise cause confusing CORS mismatches
against the backend's Origin allowlist).

`npm run build` - runs `tsc -b && vite build`, produces a production build in `dist`.

`npm run preview` - serves a local preview of the Vite build.

`npm run test` - runs Vitest.

## Running with Docker Compose

From the `docker/` directory:

```bash
docker compose up --build
```

Before the first run, create the external network once (shared with `furli-infra` and
`furli-fronted`):

```bash
docker network create furli-net
```

This compose file publishes **no host port** - the only intended path to the app in production is
through the `nginx-proxy` container (`admin.furliplus.pl`, see `furli-infra`).

The container also gates `/` and `/assets/` behind HTTP Basic Auth as a preview layer, independent
of the real admin login. Before running, copy `docker/.htpasswd.example` to `docker/.htpasswd`
(gitignored) and replace the placeholder with a real bcrypt hash:

```bash
htpasswd -nB <username>
```

## Production domain

`admin.furliplus.pl` - routed and TLS-terminated by `furli-infra`'s `nginx-proxy` container, which
reverse-proxies to this app's container (`furli-admin`) over `furli-net`.

## Authentication

Single-role admin authentication, backend-backed:

- `POST /api/admin/auth/login`
- `POST /api/admin/auth/logout`

Behavior:
- after login, the session (`accessToken`, `refreshToken`, `expiresAt`, `admin`) is stored in local
  storage under `furli_admin_auth_v1` (a distinct key from `furli-fronted`'s `furli_auth_v2`, so the
  two apps' sessions never collide if ever opened on a related origin),
- unauthenticated users are redirected to `/login`,
- a `401` response from the backend clears the local session and redirects to `/login`,
- backend authorization remains the source of truth - this app has no notion of roles/permissions
  beyond "logged in as an admin or not".

## Relationship to furli-fronted

This app was extracted from `furli-fronted`'s `/admin/**` route space. Shared UI (buttons, cards,
theme tokens, icons, i18n engine) was **copied**, not moved into a shared package, since that was
judged the lowest-cost approach at this stage - `furli-fronted` keeps its own copies of the same
files. Any future shared-component change needs to be applied in both repos until/unless they're
consolidated into an actual shared package.

Admin-domain logic (`features/admin/**` - routes, layout, pages, mock state) was copied close to
1:1, since it was already fully self-contained in `furli-fronted` and only referenced other
admin-only code plus the shared UI kit.