#!/bin/bash
set -e
set -a
source "$(dirname "${BASH_SOURCE[0]}")/../.env"
set +a

REPO_DIR="$HOME/bots/rva-scan/RVA"
DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL}"

# Seuil de 5 jours en secondes (5 * 24 * 60 * 60)
FIVE_DAYS_SEC=432000
NOW_SEC=$(date +%s)
THRESHOLD_SEC=$((NOW_SEC - FIVE_DAYS_SEC))

cd "$REPO_DIR" && git fetch origin && git reset --hard origin/main

for SERVICE in backend frontend cron; do
  cd "$REPO_DIR/$SERVICE"
  npm install --package-lock-only --silent

  # --- Audit de sécurité ---
  AUDIT=$(npm audit --json --audit-level=high 2>/dev/null || true)
  VULN_COUNT=$(echo "$AUDIT" | jq '(.metadata.vulnerabilities.high // 0) + (.metadata.vulnerabilities.critical // 0)' 2>/dev/null || echo 0)

  if [ "$VULN_COUNT" -gt 0 ]; then
    curl -s -H "Content-Type: application/json" -X POST \
      -d "$(jq -n --arg svc "$SERVICE" --arg count "$VULN_COUNT" \
        '{content: ":warning: **\($svc)** — \($count) vulnérabilité(s) npm HIGH/CRITICAL — `npm audit fix`"}')" \
      "$DISCORD_WEBHOOK_URL"
  fi

  # --- Filtre des paquets obsolètes (> 5 jours) ---
  OUTDATED=$(npm outdated --json 2>/dev/null || echo "{}")
  OLD_OUTDATED_COUNT=0

  # On parcourt chaque paquet obsolète trouvé par npm outdated
  for PKG in $(echo "$OUTDATED" | jq -r 'keys[]'); do
    # Récupération de la version 'latest' recommandée par npm outdated
    LATEST_VER=$(echo "$OUTDATED" | jq -r --arg pkg "$PKG" '.[$pkg].latest')

    if [ -n "$LATEST_VER" ] && [ "$LATEST_VER" != "null" ]; then
      # Date de publication ISO de la version 'latest'
      PUB_DATE=$(npm view "${PKG}@${LATEST_VER}" time."${LATEST_VER}" 2>/dev/null || true)

      if [ -n "$PUB_DATE" ]; then
        # Conversion de la date ISO en timestamp UNIX (compatible Linux/macOS)
        PUB_SEC=$(date -d "$PUB_DATE" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "${PUB_DATE%.*}" +%s 2>/dev/null || echo 0)

        # Si la version a été publiée il y a plus de 5 jours
        if [ "$PUB_SEC" -gt 0 ] && [ "$PUB_SEC" -lt "$THRESHOLD_SEC" ]; then
          OLD_OUTDATED_COUNT=$((OLD_OUTDATED_COUNT + 1))
        fi
      fi
    fi
  done

  # Notification Discord si au moins 1 paquet respecte le critère des 5 jours
  if [ "$OLD_OUTDATED_COUNT" -gt 0 ]; then
    curl -s -H "Content-Type: application/json" -X POST \
      -d "$(jq -n --arg svc "$SERVICE" --arg count "$OLD_OUTDATED_COUNT" \
        '{content: ":package: **\($svc)** — \($count) paquet(s) npm obsolète(s) depuis +5j"}')" \
      "$DISCORD_WEBHOOK_URL"
  fi

  cd "$REPO_DIR"
done