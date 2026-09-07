#!/usr/bin/env bash
# Sklada samowystarczalny katalog deployment-<env>/deployment/ dla JEDNEGO srodowiska. Zewnetrzny
# katalog (deployment-<env>/) istnieje tylko LOKALNIE, zeby zbudowane bundle roznych srodowisk
# mogly wspolistniec w tym samym checkoucie bez nadpisywania sie nawzajem - na serwer kopiuje sie
# zawsze TYLKO wewnetrzny katalog "deployment" (bez sufiksu srodowiska), tak zeby sciezka na
# serwerze byla identyczna niezaleznie od tego, ktore srodowisko tam wdrazasz (patrz
# scripts/start-all.sh w furli-infra, ktore zawsze odwoluje sie do "deployment/docker/..."). Nie
# buduje nic lokalnie - docker/Dockerfile (niezmieniony) uruchamia "npm ci && npm run build"
# wewnatrz obrazu na serwerze, dokladnie tak jak juz dzis opisuje README.md ("Running with Docker
# Compose").
#
# Uzycie: ./build.sh [env]   (domyslnie: prod - tak samo jak deploy.sh)
set -euo pipefail

cd "$(dirname "$0")"

ENV_ARG="${1:-prod}"
WRAPPER_DIR="deployment-${ENV_ARG}"
OUT_DIR="${WRAPPER_DIR}/deployment"

# lib/env.sh nie jest tu trzymane jako recznie synchronizowana kopia (patrz historia tego pliku) -
# bierzemy je swiezo z furli-infra przy kazdym budowaniu, wiec zawsze jest aktualne wzgledem
# jedynego prawdziwego zrodla.
INFRA_ENV_SH="../furli-infra/scripts/lib/env.sh"
if [ ! -f "$INFRA_ENV_SH" ]; then
  echo "Blad: nie znaleziono $INFRA_ENV_SH." >&2
  echo "furli-infra musi byc wypiecowane obok tego repo (ten sam katalog nadrzedny)." >&2
  exit 1
fi

echo "==> Przygotowanie katalogu $OUT_DIR/ (czyszczenie poprzedniej zawartosci)..."
rm -rf "$WRAPPER_DIR"
mkdir -p "$OUT_DIR"

echo "==> Kopiowanie niezbednych plikow do zbudowania i uruchomienia na serwerze..."
cp package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json \
   vite.config.ts vite.config.js vite.config.d.ts index.html "$OUT_DIR/"
cp -r src public docker "$OUT_DIR/"

# .htpasswd (Basic Auth) i docker/.env.dev / docker/.env.prod (patrz docker/.env.template) sa
# lokalnymi/serwerowymi sekretami - nigdy nie trafiaja do $OUT_DIR/, nawet jesli istnieja lokalnie
# na maszynie budujacej ten pakiet (cp -r docker powyzej skopiowalby je, gdyby tu byly). Musza juz
# recznie istniec na serwerze obok docker-compose.yml.
rm -f "$OUT_DIR/docker/.htpasswd" "$OUT_DIR/docker/.env.dev" "$OUT_DIR/docker/.env.prod"

echo "==> Kopiowanie deploy.sh (domyslne --env dopasowane do '$ENV_ARG') i lib/env.sh z furli-infra..."
cp deploy/deploy.sh "$OUT_DIR/deploy.sh"
sed -i "s/^ENV_ARG=\"prod\"\$/ENV_ARG=\"${ENV_ARG}\"/" "$OUT_DIR/deploy.sh"
mkdir -p "$OUT_DIR/lib"
cp "$INFRA_ENV_SH" "$OUT_DIR/lib/env.sh"
chmod +x "$OUT_DIR/deploy.sh"

echo "==> Gotowe."
echo "    $OUT_DIR/ zawiera wszystko potrzebne do zbudowania i uruchomienia panelu admina na"
echo "    serwerze srodowiska '$ENV_ARG'. Skopiuj TYLKO ten wewnetrzny katalog (bez sufiksu"
echo "    -${ENV_ARG}) na serwer, tak zeby tam nazywal sie po prostu 'deployment':"
echo "      rsync -av $OUT_DIR/ user@serwer:/opt/furli-admin/deployment/"
echo "    Upewnij sie ze deployment/docker/.htpasswd i deployment/docker/.env.${ENV_ARG} istnieja"
echo "    tam, wejdz do deployment/ i uruchom ./deploy.sh."
