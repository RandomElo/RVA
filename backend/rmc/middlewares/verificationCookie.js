import jwt from "jsonwebtoken";
import { logger } from "../../fonctions/utilitaires/logger.js";

export const verificationCookie = (req, res, next) => {
    if (req.cookies.utilisateur != undefined) {
        jwt.verify(req.cookies.utilisateur, process.env.CHAINE_JWT_COOKIE, async (error, decoder) => {
            try {
                if (error) {
                    logger.warn({
                        type: "AUTH_TOKEN_INVALIDE",
                        ip: req.ip,
                        route: req.originalUrl,
                        erreur: error.message
                    }, `🚫 Tentative d'accès avec un token invalide/expiré depuis l'IP ${req.ip}`);

                    // Cookie effacé puis requête traitée en anonyme : les routes protégées répondent 403 via accesUtilisateur/accesAdmin.
                    res.clearCookie("utilisateur");
                    return next();

                } else {
                    const utilisateur = await req.Utilisateurs.findByPk(decoder.id, { raw: true });
                    if (utilisateur) {
                        req.idUtilisateur = decoder.id;
                        next();
                    } else {
                        logger.warn({
                            type: "AUTH_TOKEN_UTILISATEUR_INEXISTANT",
                            ip: req.ip,
                            route: req.originalUrl,
                        }, `🚫 Tentative d'accès avec un token d'un utilisateur inexistant depuis l'IP ${req.ip}`);
                        res.clearCookie("utilisateur");
                        return next();
                    }
                }
            } catch (erreur) {
                logger.error({
                    type: "AUTH_TOKEN_VERIF_ERREUR",
                    ip: req.ip,
                    route: req.originalUrl,
                    erreur: erreur.message
                }, "Erreur lors de la vérification du cookie");
                if (!res.headersSent) {
                    return res.status(500).json({ etat: false, detail: "Erreur lors de la vérification de l'authentification" });
                }
            }
        });
    } else {
        next();
    }
};
