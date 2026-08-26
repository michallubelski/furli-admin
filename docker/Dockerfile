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
COPY src ./src
COPY .env.production ./.env.production

RUN npm run build

FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
