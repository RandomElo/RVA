#!/bin/bash
set -e
set -a
source "$(dirname "${BASH_SOURCE[0]}")/../.env"
set +a

REPO_DIR="$HOME/bots/rva-scan/RVA"
DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL}"

cd "$REPO_DIR" && git fetch origin && git reset --hard origin/main


for SERVICE in backend frontend; do
  trivy fs --severity HIGH,CRITICAL --format json -q "./$SERVICE" > "/tmp/trivy-$SERVICE.json"

  COUNT=$(jq '[.Results[]?.Vulnerabilities[]?] | length' "/tmp/trivy-$SERVICE.json")
  if [ "$COUNT" -gt 0 ]; then
    SUMMARY=$(jq -r '[.Results[]?.Vulnerabilities[]? | "\(.VulnerabilityID) (\(.Severity))"] | .[0:10] | join("\n")' "/tmp/trivy-$SERVICE.json")
    curl -s -H "Content-Type: application/json" -X POST \
      -d "$(jq -n --arg svc "$SERVICE" --arg count "$COUNT" --arg list "$SUMMARY" \
        '{content: ":rotating_light: **\($svc)** — \($count) CVE HIGH/CRITICAL\n```\n\($list)\n```"}')" \
      "$DISCORD_WEBHOOK_URL"
  fi
done
