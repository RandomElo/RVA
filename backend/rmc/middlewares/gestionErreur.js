import { logger } from "../../fonctions/utilitaires/logger.js";

export default function gestionErreur(action, emplacement, detailReponse) {
    return async (req, res, next) => {
        try {
            await action(req, res, next);
        } catch (erreur) {
            logger.error(
                {
                    type: "ERREUR_APPLICATIVE",
                    emplacement: emplacement || "inconnu",
                    route: req.originalUrl || req.url,
                    methode: req.method,
                    ip: req.ip,
                    userId: req.idUtilisateur || req.user?.id || null,
                    erreur: {
                        nom: erreur.name,
                        message: erreur.message,
                        stack: erreur.stack,
                    },
                },
                `❌ Erreur dans [${emplacement || "Inconnu"}] : ${erreur.message}`
            );

            if (!res.headersSent) {
                return res.status(500).json({ etat: false, detail: detailReponse });
            }
        }
    };
}