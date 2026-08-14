#!/bin/bash

echo "🚀 Exécution initiale du script de rapport..."
node /app/scripts/rapportStatistique.js || echo "⚠️ Échec lors de l'exécution initiale"

echo "⏰ Démarrage du service Cron..."
exec crond -f -l 2