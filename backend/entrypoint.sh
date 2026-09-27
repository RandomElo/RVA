#!/bin/sh
# Applique les migrations de schéma avant de lancer la commande du conteneur
# (CMD du Dockerfile en prod, `command` de docker-compose.override.yml en dev).
# set -e : si une migration échoue, le conteneur s'arrête au lieu de démarrer sur un schéma incomplet.
set -e

npx --no-install sequelize-cli db:migrate

exec "$@"
