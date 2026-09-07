FROM node:20-alpine AS build

WORKDIR /app

ARG NPM_VERSION=11.13.0

COPY package.json package-lock.json ./
# Keep dependency resolution identical to the npm version used to generate package-lock.json.
# The npm 10 bundled with node:20-alpine resolves optional native peers differently and rejects
# this valid lockfile before the application build can start. 11.6.2 itself later turned out to
# have its own related bug - `npm ci` can error with EBADPLATFORM on a lockfile with nested,
# platform-gated optional deps instead of silently skipping the ones that don't match the current
# os/cpu (hit this in furli-fronted's lockfile, via vitest's own vendored esbuild). Kept in sync
# with the other two frontend repos' Dockerfiles for the same reason - bump again only after
# confirming `docker build --no-cache` passes.
RUN npm install --global "npm@${NPM_VERSION}" \
    && npm ci

COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY public ./public
COPY src ./src

# Baked into the bundle by Vite at build time (any VITE_-prefixed process env var is exposed via
# import.meta.env automatically - no .env file needed). Passed as a build arg from
# docker-compose.yml's build.args, sourced from docker/.env on the server - see
# docker/.env.prod.template / docker/.env.dev.template. Replaces the previous
# `COPY .env.production` (that file was already gitignored, never committed, but required a real
# values file to sit at the repo root on whichever machine ran the build - docker/.env is now the
# one place server-side config lives, consistent with every other app/backend).
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
