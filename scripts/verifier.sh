#!/bin/sh
# Lance toutes les vérifications du projet dans les conteneurs de dev.
# Usage : ./scripts/verifier.sh (depuis n'importe où, conteneurs démarrés)
# Code de sortie non nul si une vérification bloquante échoue. Le lint est affiché mais non bloquant.
# La sortie complète de chaque étape (lint compris) est écrite dans audits/verification-AAAA-MM-JJ-HHMM.md.

BACKEND=rva-backend-1
FRONTEND=rva-frontend-1
MEMOIRE="NODE_OPTIONS=--max-old-space-size=2048"
RACINE=$(cd "$(dirname "$0")/.." && pwd)
RAPPORT="$RACINE/audits/verification-$(date +%Y-%m-%d-%H%M).md"
STATUT=$(mktemp)
# En sortant : supprime le fichier temporaire et retire les codes couleur ANSI du rapport.
trap 'rm -f "$STATUT"; sed -i "s/$(printf "\033")\[[0-9;]*[A-Za-z]//g" "$RAPPORT"' EXIT
echecs=""

mkdir -p "$RACINE/audits"
{
    printf '# Vérification du %s\n\n' "$(date '+%Y-%m-%d %H:%M')"
    printf 'Commit : %s\n\n' "$(git -C "$RACINE" log -1 --format='%h %s' 2>/dev/null)"
    printf 'Fichiers modifiés :\n\n```\n%s\n```\n' "$(git -C "$RACINE" status --short 2>/dev/null)"
} >"$RAPPORT"

# Écrit la sortie de la commande dans le rapport (dans un bloc de code) et renvoie son code de sortie.
journaliser() {
    printf '\n```\n' >>"$RAPPORT"
    {
        "$@" 2>&1
        echo $? >"$STATUT"
    } | tee -a "$RAPPORT"
    printf '```\n' >>"$RAPPORT"
    return "$(cat "$STATUT")"
}

etape() {
    nom="$1"
    shift
    printf '\n== %s\n' "$nom"
    printf '\n## %s\n' "$nom" >>"$RAPPORT"
    if journaliser "$@"; then
        printf -- '-> OK\n'
        printf '\nRésultat : OK\n' >>"$RAPPORT"
    else
        printf -- '-> ÉCHEC\n'
        printf '\nRésultat : ÉCHEC\n' >>"$RAPPORT"
        echecs="$echecs\n  - $nom"
    fi
}

for c in "$BACKEND" "$FRONTEND"; do
    if [ "$(docker inspect -f '{{.State.Running}}' "$c" 2>/dev/null)" != "true" ]; then
        echo "Le conteneur $c n'est pas démarré (docker compose up -d)."
        printf '\nArrêt : le conteneur %s n'"'"'est pas démarré.\n' "$c" >>"$RAPPORT"
        exit 1
    fi
done

etape "Tests backend" docker exec "$BACKEND" npm test
etape "TypeScript frontend" docker exec -e "$MEMOIRE" "$FRONTEND" npx tsc -b --noEmit
etape "Tests frontend" docker exec "$FRONTEND" npm test
etape "Build frontend" docker exec -e "$MEMOIRE" "$FRONTEND" sh -c 'npx vite build --outDir /tmp/verif-build > /dev/null && rm -rf /tmp/verif-build'

# Lint complet dans le rapport, seulement le résumé à l'écran.
printf '\n== Lint frontend (non bloquant)\n'
printf '\n## Lint frontend (non bloquant)\n\n```\n' >>"$RAPPORT"
docker exec "$FRONTEND" npx eslint . 2>&1 | tee -a "$RAPPORT" | tail -n 3
printf '```\n' >>"$RAPPORT"

printf '\n## Bilan\n\n' >>"$RAPPORT"
if [ -n "$echecs" ]; then
    printf '\nÉchecs :%b\n' "$echecs"
    printf 'Échecs :%b\n' "$echecs" >>"$RAPPORT"
    printf '\nRapport : %s\n' "$RAPPORT"
    exit 1
fi
printf '\nToutes les vérifications bloquantes passent.\n'
printf 'Toutes les vérifications bloquantes passent.\n' >>"$RAPPORT"
printf '\nRapport : %s\n' "$RAPPORT"
