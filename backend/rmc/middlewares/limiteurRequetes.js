import rateLimit from "express-rate-limit";
import { logger } from "../../fonctions/utilitaires/logger.js";

// Fonction helper pour vérifier si l'on est en mode développement
const estEnDev = process.env.MODE === "dev" || process.env.NODE_ENV === "development";

/**
 * Vérifie si la requête provient d'un sous-réseau interne Docker (172.16.0.0 à 172.31.255.255),
 * de localhost, ou possède un header d'authentification interne pour le pre-render.
 */
const DoitIgnorerLimiter = (req) => {
    if (estEnDev) return true;

    // 1. Bypass via Header secret (Recommandé pour les builds/SSR)
    const secretHeader = req.headers["x-internal-secret"];
    if (process.env.INTERNAL_API_SECRET && secretHeader === process.env.INTERNAL_API_SECRET) {
        return true;
    }

    // 2. Bypass via IP (Localhost ou plage Privée Docker 172.16.0.0/12)
    const ip = req.ip || req.socket.remoteAddress || "";
    const estLocalhost = ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
    const estDockerPrivateSubnet = /^::ffff:(172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)$/.test(ip) ||
        /^(172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)$/.test(ip);

    return estLocalhost || estDockerPrivateSubnet;
};

/**
 * S'applique à TOUTES les requêtes de l'API.
 * Empêche le spam global, le scraping agressif et les attaques DoS de base.
 */
export const generaleLimiteur = rateLimit({
    skip: DoitIgnorerLimiter,
    windowMs: 15 * 60 * 1000, // Fenêtre de 15 minutes
    max: 300, // Limite chaque IP à 300 requêtes par fenêtre de 15 min
    standardHeaders: true, // Renvoie les en-têtes `RateLimit-*` standard
    legacyHeaders: false, // Désactive les en-têtes `X-RateLimit-*`
    handler: (req, res, next, options) => {
        logger.warn({
            type: 'RATE_LIMIT_EXCEEDED',
            ip: req.ip,
            route: req.originalUrl,
            method: req.method,
            limit: options.max,
            windowMs: options.windowMs,
        }, `🛑 GeneraleLimiteur atteint par l'IP ${req.ip} sur ${req.originalUrl}`);

        res.status(429).json(options.message);
    },
    message: {
        etat: false,
        detail: "Trop de requêtes provenant de cette IP, veuillez réessayer dans 15 minutes."
    }
});

/**
 * LIMITER STRICT (Authentification & Mots de passe)
 * Empêche les attaques par force brute (Brute-Force / Credential Stuffing).
 */
export const authLimiteur = rateLimit({
    skip: DoitIgnorerLimiter,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Max 10 tentatives par 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn({
            type: 'RATE_LIMIT_EXCEEDED',
            ip: req.ip,
            route: req.originalUrl,
            method: req.method,
            limit: options.max,
            windowMs: options.windowMs,
        }, `🛑 AuthLimiteur atteint par l'IP ${req.ip} sur ${req.originalUrl}`);

        res.status(429).json(options.message);
    },
    message: {
        etat: false,
        detail: "Trop de tentatives de connexion/vérification. Réessayez dans 15 minutes."
    }
});

/**
 * LIMITER MOYEN (Formulaires publics, Mails, Suggestions)
 * Empêche le spam de formulaires et la saturation de l'envoi d'emails.
 */
export const formulaireOuMailLimiteur = rateLimit({
    skip: DoitIgnorerLimiter,
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 10, // Max 10 envois par heure
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn({
            type: 'RATE_LIMIT_EXCEEDED',
            ip: req.ip,
            route: req.originalUrl,
            method: req.method,
            limit: options.max,
            windowMs: options.windowMs,
        }, `🛑 FormulaireOuMailLimiteur atteint par l'IP ${req.ip} sur ${req.originalUrl}`);

        res.status(429).json(options.message);
    },
    message: {
        etat: false,
        detail: "Vous avez dépassé la limite d'envoi. Veuillez réessayer plus tard."
    }
});

/**
 * 4. LIMITER UPLOAD & ZIP (Fichiers lourds)
 * Évite de saturer la bande passante et le stockage du serveur.
 */
export const uploadLimiteur = rateLimit({
    skip: DoitIgnorerLimiter,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Max 15 envois de fichiers / 15 min
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        logger.warn({
            type: 'RATE_LIMIT_EXCEEDED',
            ip: req.ip,
            route: req.originalUrl,
            method: req.method,
            limit: options.max,
            windowMs: options.windowMs,
        }, `🛑 UploadLimiteur atteint par l'IP ${req.ip} sur ${req.originalUrl}`);

        res.status(429).json(options.message);
    },
    message: {
        etat: false,
        detail: "Trop de fichiers envoyés. Patientez quelques minutes."
    }
});