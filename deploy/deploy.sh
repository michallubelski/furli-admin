#!/usr/bin/env bash
# Ten skrypt uruchamia sie NA SERWERZE, wewnatrz skopiowanego katalogu deployment/.
# Wywoluje dokladnie ten sam, juz istniejacy przeplyw co README.md ("Running with Docker
# Compose"): docker compose -f docker/docker-compose.yml. Nic nowego tu nie wymyslamy -
# tylko walidacja + idempotentne ponowne uruchomienie.
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Sprawdzanie Dockera..."
if ! command -v docker >/dev/null 2>&1; then
  echo "Blad: docker nie jest zainstalowany lub niedostepny w PATH." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Blad: wtyczka 'docker compose' nie jest dostepna (wymagany Docker Compose v2)." >&2
  exit 1
fi

echo "==> Budowanie obrazu (docker compose build)..."
docker compose -f docker/docker-compose.yml build

echo "==> Uruchamianie / podmiana kontenera (docker compose up -d)..."
docker compose -f docker/docker-compose.yml up -d --force-recreate --remove-orphans

echo "==> Status:"
docker compose -f docker/docker-compose.yml ps

echo "==> Gotowe. Panel admina nasluchuje wewnatrz sieci furli-net (bez publikowanego portu hosta)."
