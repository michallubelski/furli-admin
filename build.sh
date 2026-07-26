#!/usr/bin/env bash
# Sklada samowystarczalny katalog deployment/ gotowy do recznego skopiowania na serwer
# (scp/rsync) i uruchomienia tam przez deployment/deploy.sh. Nie buduje nic lokalnie -
# docker/Dockerfile (niezmieniony) uruchamia "npm ci && npm run build" wewnatrz obrazu na
# serwerze, dokladnie tak jak juz dzis opisuje README.md ("Running with Docker Compose").
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Przygotowanie katalogu deployment/ (czyszczenie poprzedniej zawartosci)..."
rm -rf deployment
mkdir -p deployment

echo "==> Kopiowanie niezbednych plikow do zbudowania i uruchomienia na serwerze..."
cp package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json \
   vite.config.ts vite.config.js vite.config.d.ts index.html .env.production deployment/
cp -r src docker deployment/

# .htpasswd (Basic Auth) jest lokalnym/serwerowym sekretem - nigdy nie trafia do deployment/;
# musi juz recznie istniec na serwerze obok docker-compose.yml (patrz docker/docker-compose.yml).
#rm -f deployment/docker/.htpasswd

echo "==> Kopiowanie deploy.sh..."
cp deploy/deploy.sh deployment/deploy.sh
chmod +x deployment/deploy.sh

echo "==> Gotowe."
echo "    Katalog deployment/ zawiera wszystko potrzebne do zbudowania i uruchomienia panelu admina na serwerze."
echo "    Skopiuj go na serwer (np. rsync -av deployment/ user@serwer:/opt/furli-admin/),"
echo "    upewnij sie ze docker/.htpasswd istnieje tam (jesli wymagany), wejdz do katalogu"
echo "    i uruchom ./deploy.sh."
