import { logger } from "../../../fonctions/utilitaires/logger.js";

// Ouvre la session : génère le jeton (modèle), pose le cookie et renvoie objetRetour
export async function ouvrirSession(req, res, utilisateur, objetRetour) {
    try {
        const tokenJWT = await req.Utilisateurs.genererTokenSession(utilisateur);
        return res
            .cookie("utilisateur", tokenJWT, {
                maxAge: 3 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                sameSite: "Strict",
                secure: process.env.MODE == "production",
            })
            .json(objetRetour);
    } catch (erreur) {
        logger.error({
            type: "AUTH_GENERATION_TOKEN",
            erreur: { nom: erreur.name, message: erreur.message, stack: erreur.stack },
        }, "Erreur lors de la génération du cookie d'authentification");
        return res.json({ etat: false, detail: "Erreur lors de la génération du cookie d'authentification" });
    }
}
