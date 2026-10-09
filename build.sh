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

# The bundle deliberately carries this machine's secrets (docker/.env.<env>): unpacked on the server it
# brings them along, so the server needs no hand-kept copy. Keep the line below commented out -
# uncomment it only to build a bundle without secrets.
#rm -f "$OUT_DIR/docker/.env.dev" "$OUT_DIR/docker/.env.prod"

echo "==> Kopiowanie deploy.sh (domyslne --env dopasowane do '$ENV_ARG') i lib/env.sh z furli-infra..."
cp deploy/deploy.sh "$OUT_DIR/deploy.sh"
sed -i "s/^ENV_ARG=\"prod\"\$/ENV_ARG=\"${ENV_ARG}\"/" "$OUT_DIR/deploy.sh"
mkdir -p "$OUT_DIR/lib"
cp "$INFRA_ENV_SH" "$OUT_DIR/lib/env.sh"
chmod +x "$OUT_DIR/deploy.sh"

# Packs the built deployment/ folder into one zip next to it (deployment-<env>/deployment.zip), with
# "deployment/" as its only top-level folder, so on the server it unpacks to the same path as an
# rsync of the folder would. Python's zipfile instead of `zip`, which Git Bash on Windows lacks; the
# Unix modes are set explicitly (Windows has no execute bit to copy), so deploy.sh and mvnw stay
# executable after `unzip` on the server.
ZIP_NAME="deployment.zip"
PYTHON_BIN=""
for candidate in python3 python; do
  if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c "import zipfile" >/dev/null 2>&1; then
    PYTHON_BIN="$candidate"
    break
  fi
done
if [ -z "$PYTHON_BIN" ]; then
  echo "Blad: do spakowania paczki potrzebny jest Python 3 (python3 lub python w PATH)." >&2
  exit 1
fi
echo "==> Pakowanie $OUT_DIR/ do $WRAPPER_DIR/$ZIP_NAME..."
"$PYTHON_BIN" - "$WRAPPER_DIR" "$ZIP_NAME" <<'PY'
import os, sys, time, zipfile

wrapper, zip_name = sys.argv[1], sys.argv[2]
executables = {"deploy.sh", "mvnw"}
with zipfile.ZipFile(os.path.join(wrapper, zip_name), "w", zipfile.ZIP_DEFLATED) as archive:
    for folder, dirs, files in os.walk(os.path.join(wrapper, "deployment")):
        dirs.sort()
        rel_folder = os.path.relpath(folder, wrapper).replace(os.sep, "/")
        entry = zipfile.ZipInfo(rel_folder + "/", time.localtime(os.path.getmtime(folder))[:6])
        entry.external_attr = (0o40755 << 16) | 0x10
        entry.create_system = 3
        archive.writestr(entry, b"")
        for name in sorted(files):
            path = os.path.join(folder, name)
            entry = zipfile.ZipInfo(rel_folder + "/" + name, time.localtime(os.path.getmtime(path))[:6])
            entry.compress_type = zipfile.ZIP_DEFLATED
            mode = 0o755 if name in executables or name.endswith(".sh") else 0o644
            entry.external_attr = (0o100000 | mode) << 16
            entry.create_system = 3
            with open(path, "rb") as source:
                archive.writestr(entry, source.read())
PY

echo "==> Gotowe."
echo "    Paczka do wyslania na serwer: $WRAPPER_DIR/$ZIP_NAME (w srodku katalog deployment/)."
echo "    $OUT_DIR/ zawiera wszystko potrzebne do zbudowania i uruchomienia panelu admina na"
echo "    serwerze srodowiska '$ENV_ARG'. Skopiuj TYLKO ten wewnetrzny katalog (bez sufiksu"
echo "    -${ENV_ARG}) na serwer, tak zeby tam nazywal sie po prostu 'deployment':"
echo "      rsync -av $OUT_DIR/ user@serwer:/opt/furli-admin/deployment/"
echo "    Upewnij sie ze deployment/docker/.env.${ENV_ARG} istnieje"
echo "    tam, wejdz do deployment/ i uruchom ./deploy.sh."
