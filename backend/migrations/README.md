# Migrations

Le schéma de la base est géré par `sequelize-cli` (fichiers `.cjs`, le backend étant en ESM). `entrypoint.sh` lance `db:migrate` à chaque démarrage du conteneur backend, avant les données initiales et le serveur. `sequelize.sync()` n'est plus utilisé.

## Base existante créée par `sync()`

À faire une seule fois, avant le premier déploiement avec migrations :

```sh
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backend/migrations/README-marquage.sql
```

## Nouvelle migration

```sh
docker compose exec backend npx sequelize-cli migration:generate --name ma-modification
```

Renommer le fichier généré en `.cjs`, puis modifier le modèle correspondant dans `bdd/modeles/` pour qu'il reste identique au schéma.
