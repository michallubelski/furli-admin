#!/usr/bin/env bash
# Ten skrypt uruchamia sie NA SERWERZE, wewnatrz skopiowanego katalogu deployment/.
# Wywoluje dokladnie ten sam, juz istniejacy przeplyw co README.md ("Running with Docker
# Compose"): docker compose -f docker/docker-compose.yml -f docker/docker-compose.<env>.yml. Nic
# nowego tu nie wymyslamy - tylko walidacja + idempotentne ponowne uruchomienie.
#
# Obsluguje --env <nazwa> (domyslnie: prod) - patrz furli-infra/README.md "Environments". Kazde
# srodowisko ma wlasny plik nadpisan compose (docker/docker-compose.<env>.yml) i wlasny plik
# sekretow (docker/.env.<env>, kopiowany z docker/.env.template - patrz nizej). Bez --env
# zachowanie jest identyczne jak przed wprowadzeniem wielu srodowisk: siec furli-net, brak
# prefiksu w nazwie kontenera.
set -euo pipefail

cd "$(dirname "$0")"
# shellcheck source=lib/env.sh
source lib/env.sh

ENV_ARG="prod"
while [ $# -gt 0 ]; do
  case "$1" in
    --env) [ $# -ge 2 ] || { echo "Blad: --env wymaga argumentu." >&2; exit 1; }; ENV_ARG="$2"; shift 2 ;;
    --env=*) ENV_ARG="${1#--env=}"; shift ;;
    -h|--help) echo "Uzycie: $(basename "$0") [--env <nazwa>]" >&2; exit 0 ;;
    *) echo "Blad: nieznany argument '$1'." >&2; exit 1 ;;
  esac
done
furli_env_resolve "$ENV_ARG"
PROJECT="$(furli_compose_project_name furli-admin)"

ENV_FILE="docker/.env.${FURLI_ENV}"
ENV_COMPOSE_FILE="docker/docker-compose.${FURLI_ENV}.yml"

echo "==> Sprawdzanie Dockera..."
if ! command -v docker >/dev/null 2>&1; then
  echo "Blad: docker nie jest zainstalowany lub niedostepny w PATH." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Blad: wtyczka 'docker compose' nie jest dostepna (wymagany Docker Compose v2)." >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Blad: brak pliku $ENV_FILE." >&2
  echo "Skopiuj docker/.env.template do $ENV_FILE i uzupelnij prawdziwe wartosci przed uruchomieniem." >&2
  exit 1
fi
if [ ! -f "$ENV_COMPOSE_FILE" ]; then
  echo "Blad: brak pliku $ENV_COMPOSE_FILE (nadpisania compose dla srodowiska '$FURLI_ENV')." >&2
  exit 1
fi

echo "==> Budowanie obrazu (docker compose build)..."
docker compose -p "$PROJECT" --env-file "$ENV_FILE" -f docker/docker-compose.yml -f "$ENV_COMPOSE_FILE" build

echo "==> Uruchamianie / podmiana kontenera (docker compose up -d)..."
docker compose -p "$PROJECT" --env-file "$ENV_FILE" -f docker/docker-compose.yml -f "$ENV_COMPOSE_FILE" up -d --force-recreate --remove-orphans

echo "==> Status:"
docker compose -p "$PROJECT" --env-file "$ENV_FILE" -f docker/docker-compose.yml -f "$ENV_COMPOSE_FILE" ps

echo "==> Gotowe ($FURLI_ENV). Panel admina nasluchuje wewnatrz sieci Docker '$FURLI_NET' (bez publikowanego portu hosta)."
