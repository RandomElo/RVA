# Docker

## Fichiers

### docker-compose.override.yml

Permet d'override `docker-compose.yml` permettant l'utilisation de nodemon et Vite ainsi qu'une exposition de la BDD.

### Dockerfile.dev

Permet le téléchargement de `devDependencies`

### dozzle-users.yml
Permet l'accès par mot de passe à Dozzle
Pour obtenir un mot de passe hash il suffit de faire :
```
docker run --rm amir20/dozzle generate --password "votre_mot_de_passe_ici"
```