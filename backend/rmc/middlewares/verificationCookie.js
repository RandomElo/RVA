import jwt from "jsonwebtoken";
import { logger } from "../../fonctions/utilitaires/logger.js";

export const verificationCookie = (req, res, next) => {
    if (req.cookies.utilisateur != undefined) {
        jwt.verify(req.cookies.utilisateur, process.env.CHAINE_JWT_COOKIE, async (error, decoder) => {
            if (error) {
                logger.warn({
                    type: "AUTH_TOKEN_INVALIDE",
                    ip: req.ip,
                    route: req.originalUrl,
                    erreur: error.message
                }, `🚫 Tentative d'accès avec un token invalide/expiré depuis l'IP ${req.ip}`);

                res.clearCookie("utilisateur");
                return res.json({ etat: true, detail: "accueil" });

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
                    return res.json({ etat: true, detail: "accueil" });
                }
            }
        });
    } else {
        next();
    }
};
