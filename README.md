# RVA — Running Vincennes Association

Projet de refonte graphique d'un site internet d'un club de course à pied.
Le projet est une application web complète : site vitrine public, espace adhérents, back-office
d'administration, et intégration HelloAsso pour la gestion des adhérents et autres évènements.

- **Frontend** : React 18 + TypeScript + Vite, prérendu (SSG-like via Puppeteer) pour le SEO.
- **Backend** : Node.js / Express, PostgreSQL, envoi d'e-mails (Handlebars), intégration HelloAsso.
- **Orchestration** : Docker Compose (Nginx, Postgres, Certbot, Dozzle, tâche cron).

Ce dépôt regroupe les trois briques dans une architecture mono-repo :

```
RVA/
├── backend/     → API Express + accès PostgreSQL
├── frontend/    → Application React (Vite) servie par Nginx
├── cron/        → Conteneur exécutant des tâches planifiées (rapports statistiques, etc.)
├── z annexes/   → Documentation technique, scripts Docker/scans de sécurité
├── docker-compose.yaml
└── .env
```

Des README détaillés existent également dans chaque sous-dossier :
- [`backend/README.md`](./backend/README.md)
- [`frontend/README.md`](./frontend/README.md)

---

## 1. Architecture générale

```
                         ┌────────────────────┐
 Internet ── 80/443 ──>  │   Nginx (frontend) │  ── sert le SPA React prérendu
                         │  + reverse proxy   │
                         └─────────┬──────────┘
                                   │ /utilisateurs /articles /courses
                                   │ /statistiques /specialistes /fichiers
                                   │ /images /pages /helloasso /autres
                                   ▼
                         ┌────────────────────┐
                         │   Backend (Express)│  Port interne 8100
                         └─────────┬──────────┘
                                   │
                         ┌─────────┴──────────┐
                         ▼                    ▼
                 ┌───────────────┐   ┌────────────────────┐
                 │  PostgreSQL   │   │  Services externes │
                 │   (réseau     │   │  HelloAsso API,    │
                 │  back interne)│   │  SMTP (mailer)       │
                 └───────────────┘   └────────────────────┘

  ┌───────────┐   ┌───────────┐
  │  Certbot  │   │  Dozzle   │   Cron (rapports périodiques → backend)
  │  (TLS)    │   │  (logs)   │
  └───────────┘   └───────────┘
```

Le réseau Docker est scindé en deux :
- **`front`** : accessible depuis l'extérieur (frontend, certbot, backend, cron).
- **`back`** : réseau **interne** (`internal: true`), sans accès direct à Internet — seuls `db` et
  `backend` y sont connectés, ce qui isole la base de données.

## 2. Services Docker Compose

| Service    | Image / build     | Rôle                                                              | Ports exposés        |
|------------|--------------------|--------------------------------------------------------------------|-----------------------|
| `db`       | `postgres:16-alpine` | Base de données PostgreSQL, logs détaillés (DDL, connexions)     | interne uniquement    |
| `backend`  | `./backend`         | API REST Express, healthcheck `/autres/health-check`             | interne (`8100`)      |
| `frontend` | `./frontend`        | Build React prérendu, servi par Nginx, reverse proxy vers backend | `80`, `443`           |
| `certbot`  | `certbot/certbot`   | Renouvellement automatique des certificats Let's Encrypt (cron 12h) | —                    |
| `dozzle`   | `amir20/dozzle`     | Interface web de consultation des logs des conteneurs             | `127.0.0.1:8888:8080` |
| `cron`     | `./cron`            | Tâches planifiées (ex. rapport statistique périodique)            | —                      |

Chaque service a des limites de ressources définies (`cpus`/`memory`), `security_opt: no-new-privileges`,
et une rotation de logs JSON (`max-size: 10m`, `max-file: 3`).

### Volumes persistants
- `pgdata` : données PostgreSQL
- `certbot_etc` / `certbot_var` / `certbot_www` : certificats et challenges Let's Encrypt
- `cron_data` : état/persistance du conteneur cron

### Montages partagés
- `./frontend/public/textes` et `./frontend/public/img` sont montés à la fois dans `backend` et
  `frontend` : le backend écrit les contenus (textes JSON, images uploadées) que Nginx sert
  directement en statique.
- `./backend/medias` : stockage des médias (photos adhérents, galerie, newsletters).

## 3. Prérequis

- Docker et Docker Compose v2
- Un nom de domaine pointant vers le serveur (pour Certbot / TLS)
- Node.js ≥ 18 (uniquement pour le développement local hors conteneurs)

## 4. Variables d'environnement (racine)

Le fichier `.env` à la racine alimente `docker-compose.yaml` :

| Variable            | Description                                      |
|----------------------|---------------------------------------------------|
| `POSTGRES_USER`      | Utilisateur PostgreSQL                            |
| `POSTGRES_PASSWORD`  | Mot de passe PostgreSQL                           |
| `POSTGRES_DB`        | Nom de la base de données                         |
| `INTERNAL_SECRET`    | Secret partagé entre frontend/backend/cron (ex. pour sécuriser les appels internes/prérendu) |

Chaque sous-projet (`backend/`, `frontend/`) possède également son propre `.env` /
`.env.production` — voir les README respectifs.

## 5. Démarrage rapide (production)

```bash
# 1. Cloner le dépôt et se placer à la racine
git clone <url-du-repo> RVA && cd RVA

# 2. Configurer les variables d'environnement
cp .env.example .env            # à créer si absent, puis éditer
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Construire et lancer l'ensemble des services
docker compose up -d --build

# 4. Suivre les logs
docker compose logs -f backend frontend
# ou via l'interface Dozzle : http://<serveur>:8888 (accès local uniquement)
```

Le premier lancement de `certbot` nécessite généralement une procédure d'obtention initiale du
certificat (voir `z annexes/docker/README.md` et `Initialisation.md`) avant que Nginx ne puisse
servir en HTTPS.

## 6. Développement local

Pour développer sans tout conteneuriser :

```bash
# Backend
cd backend && npm install && npm run dev   # voir backend/README.md pour le détail des scripts

# Frontend
cd frontend && npm install && npm run dev
```

Le fichier `docker-compose.override.yml` (racine et `z annexes/docker/`) permet d'adapter la
stack pour un environnement de développement (hot-reload, volumes montés en écriture, etc.).

## 7. Sécurité

- Séparation stricte des réseaux Docker (`front` / `back` interne).
- En-têtes de sécurité HTTP centralisés dans `frontend/nginx/security-headers.conf`
  (et variante `.dev.conf` pour le développement).
- Blocage explicite au niveau Nginx des chemins classiques de scan/exploitation (CMS PHP,
  panels d'admin DB, fichiers de config/VCS exposés, extensions de scripts serveur, etc.) — voir
  `frontend/nginx/default.conf`.
- Scripts d'audit de dépendances/CVE dans `z annexes/scans/` (`scan-cve.sh`, `scan-npm.sh`).
- Rotation automatique des certificats TLS via Certbot.
- `security_opt: no-new-privileges:true` sur l'ensemble des conteneurs.

## 8. Documentation complémentaire

- `z annexes/Initialisation.md` : procédure d'initialisation du serveur/projet.
- `z annexes/docker/CommandesDocker.md` : aide-mémoire des commandes Docker utiles.
- `z annexes/docker/README.md` : détails sur la configuration Docker de développement.
- `z annexes/scans/README.md` : usage des scripts d'audit de sécurité.

## 9. Licence / Crédits

Voir la page `credits` du site (`frontend/src/pages/legal/Credits.tsx`) et
`frontend/public/textes/credits.json` pour l'attribution des ressources tierces (icônes, polices,
images) utilisées par le projet.