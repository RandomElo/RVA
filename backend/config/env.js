import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Point d'entrée unique du chargement des variables d'environnement.
// À importer en premier (serveur.js, bdd/bdd.js) : en ESM, les imports sont évalués
// avant le corps du module, donc tous les modules suivants voient déjà process.env rempli.
//
// Seul backend/.env est chargé, via un chemin résolu depuis ce fichier (indépendant du dossier courant).
// - En Docker (dev et prod), docker-compose injecte déjà backend/.env (env_file) et les variables
//   de `environment`. dotenv n'écrase jamais une variable déjà définie : ces valeurs restent prioritaires.
// - Hors Docker (node serveur.js depuis backend/), ce fichier fournit toute la configuration.
// Le .env racine ne sert qu'à l'interpolation de docker-compose (POSTGRES_*, INTERNAL_SECRET) :
// le backend en reçoit les valeurs utiles via `environment` et n'a pas à le lire.
const dossierBackend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

dotenv.config({ quiet: true, path: path.join(dossierBackend, ".env") });