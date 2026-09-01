import { ClientCredentials, AuthorizationCode } from 'simple-oauth2';
import fs from 'fs';
import path from 'path';
import crypto from "crypto"
import { logger } from '../utilitaires/logger.js';

// -------------------------------------------------------------
// 1. CLIENT CREDENTIALS (Pour la lecture et les paiements)
// -------------------------------------------------------------

const oauthClientCredentials = new ClientCredentials({
    client: {
        id: process.env.HELLOASSO_CLIENT_ID,
        secret: process.env.HELLOASSO_CLIENT_SECRET,
    },
    auth: {
        tokenHost: process.env.HELLOASSO_BASE_URL || 'https://api.helloasso-sandbox.com',
        tokenPath: '/oauth2/token',
    },
    options: {
        bodyFormat: 'form',
    },
});
let clientCredentialsCache = null;
let clientCredentialsExpiresAt = 0;

let clientCredentialsToken = null;

export async function getAccessToken() {
    if (clientCredentialsToken && !clientCredentialsToken.expired(60)) {
        return clientCredentialsToken.token.access_token;
    }
    console.log(oauthClientCredentials)

    logger.info('[HelloAsso] tokenHost:', process.env.HELLOASSO_BASE_URL || 'https://api.helloasso-sandbox.com');
    logger.info('[HelloAsso] client_id présent:', Boolean(process.env.HELLOASSO_CLIENT_ID));
    logger.info('[HelloAsso] client_secret présent:', Boolean(process.env.HELLOASSO_CLIENT_SECRET));

    try {
        clientCredentialsToken = await oauthClientCredentials.getToken({});
    } catch (err) {
        logger.error('[HelloAsso] échec getToken:', err.data?.payload || err.message);
        console.log(err)
        logger.error(err.data.payload)

        throw err;
    }
    console.log("=========================")
    console.log(clientCredentialsCache)
    console.log("=========================")
    return clientCredentialsToken.token.access_token;
}

// -------------------------------------------------------------
// 2. AUTHORIZATION CODE (Pour la création/modification de formulaires)
// -------------------------------------------------------------
export const clientOAuth = new AuthorizationCode({
    client: {
        id: process.env.HELLOASSO_CLIENT_ID,
        secret: process.env.HELLOASSO_CLIENT_SECRET,
    },
    auth: {
        tokenHost: process.env.HELLOASSO_BASE_URL || 'https://api.helloasso-sandbox.com',
        authorizePath: '/oauth2/authorize',
        tokenPath: '/oauth2/token',
    },
});

// -------------------------------------------------------------
// Persistance du token utilisateur (Authorization Code)
// -------------------------------------------------------------
// ⚠️ Stockage fichier = OK pour un mono-admin / mono-instance.
// Pour un déploiement multi-instance ou serverless, remplacez
// chargerTokenDepuisDisque()/sauvegarderTokenSurDisque() par une
// vraie table (Redis, Postgres, etc).
const CHEMIN_STOCKAGE_TOKEN = path.resolve(process.cwd(), ".helloasso-token.json");

function chargerTokenDepuisDisque() {
    try {
        if (fs.existsSync(CHEMIN_STOCKAGE_TOKEN)) {
            const contenu = fs.readFileSync(CHEMIN_STOCKAGE_TOKEN, "utf-8");
            return JSON.parse(contenu);
        }
    } catch (error) {
        console.error("Impossible de lire le token HelloAsso persisté :", error.message);
    }
    return null;
}

function sauvegarderTokenSurDisque(token) {
    try {
        fs.writeFileSync(CHEMIN_STOCKAGE_TOKEN, JSON.stringify(token), { mode: 0o600 });
    } catch (error) {
        console.error("Impossible de persister le token HelloAsso :", error.message);
    }
}

let tokensUtilisateur = chargerTokenDepuisDisque();
let promesseRafraichissement = null; // empêche deux refresh concurrents

export function setTokensUtilisateur(tokens) {
    tokensUtilisateur = tokens;
    sauvegarderTokenSurDisque(tokens);
}

// Utile côté front pour savoir si un admin est déjà connecté
export function estConnecteHelloAsso() {
    return Boolean(tokensUtilisateur);
}
export function genererPKCE() {
    const verifier = crypto.randomBytes(64).toString("base64url").slice(0, 128);
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    return { verifier, challenge };
}
export async function getTokenUtilisateur() {
    if (!tokensUtilisateur) {
        throw new Error("Aucun administrateur HelloAsso n'est connecté. Veuillez vous connecter via /helloasso/login");
    }

    let accessToken = clientOAuth.createToken(tokensUtilisateur);

    if (!accessToken.expired()) {
        return accessToken.token.access_token;
    }

    // Si un rafraîchissement est déjà en cours (requêtes concurrentes),
    // on réutilise la même promesse au lieu d'en déclencher un second
    // (le refresh token HelloAsso est à usage unique).
    if (!promesseRafraichissement) {
        promesseRafraichissement = accessToken
            .refresh()
            .then((nouveauToken) => {
                tokensUtilisateur = nouveauToken.token;
                sauvegarderTokenSurDisque(tokensUtilisateur);
                return tokensUtilisateur;
            })
            .catch((error) => {
                // Refresh token probablement révoqué/expiré :
                // on nettoie pour forcer une reconnexion propre côté admin.
                tokensUtilisateur = null;
                sauvegarderTokenSurDisque(null);
                throw new Error("Impossible de rafraîchir le token HelloAsso : " + error.message);
            })
            .finally(() => {
                promesseRafraichissement = null;
            });
    }

    const tokenRafraichi = await promesseRafraichissement;
    return tokenRafraichi.access_token;
}

export default getAccessToken;