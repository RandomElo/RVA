#!/bin/sh
# Lance toutes les vérifications du projet dans les conteneurs de dev.
# Usage : ./scripts/verifier.sh (depuis n'importe où, conteneurs démarrés)
# Code de sortie non nul si une vérification bloquante échoue. Le lint est affiché mais non bloquant.

BACKEND=rva-backend-1
FRONTEND=rva-frontend-1
MEMOIRE="NODE_OPTIONS=--max-old-space-size=2048"
echecs=""

etape() {
    nom="$1"
    shift
    printf '\n== %s\n' "$nom"
    if "$@"; then
        printf -- '-> OK\n'
    else
        printf -- '-> ÉCHEC\n'
        echecs="$echecs\n  - $nom"
    fi
}

for c in "$BACKEND" "$FRONTEND"; do
    if [ "$(docker inspect -f '{{.State.Running}}' "$c" 2>/dev/null)" != "true" ]; then
        echo "Le conteneur $c n'est pas démarré (docker compose up -d)."
        exit 1
    fi
done

etape "Tests backend" docker exec "$BACKEND" npm test
etape "TypeScript frontend" docker exec -e "$MEMOIRE" "$FRONTEND" npx tsc -b --noEmit
etape "Tests frontend" docker exec "$FRONTEND" npm test
etape "Build frontend" docker exec -e "$MEMOIRE" "$FRONTEND" sh -c 'npx vite build --outDir /tmp/verif-build > /dev/null && rm -rf /tmp/verif-build'

printf '\n== Lint frontend (non bloquant)\n'
docker exec "$FRONTEND" npx eslint . | tail -n 3

if [ -n "$echecs" ]; then
    printf '\nÉchecs :%b\n' "$echecs"
    exit 1
fi
printf '\nToutes les vérifications bloquantes passent.\n'
