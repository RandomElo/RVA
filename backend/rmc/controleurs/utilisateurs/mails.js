import gestionErreur from "../../middlewares/gestionErreur.js";
import envoiMail from "../../../fonctions/mailer/mailer.service.js";

import { logger } from "../../../fonctions/utilitaires/logger.js";
import { creerLimiteEnvois } from "../../../fonctions/mailer/limiteEnvois.js";

export const envoiMailAdherents = gestionErreur(async (req, res) => {
    const { sujet, corps } = req.body;

    if (!sujet?.trim() || !corps?.trim()) {
        return res.status(400).json({ etat: false, detail: "Le sujet et le corps du mail sont obligatoires." });
    }

    let liens = [];
    try {
        liens = req.body.liens ? JSON.parse(req.body.liens) : [];
    } catch {
        return res.status(400).json({ etat: false, detail: "Le format des liens est invalide." });
    }

    const utilisateurs = await req.Utilisateurs.findAll({
        // Envoi volontaire à tous les adhérents, y compris désinscrits de la newsletter : ce sont des messages de l'association
        where: { role: "adherent" },
        attributes: ["id", "prenom", "mail"],
        raw: true,
    });

    const attachments = (req.files ?? []).map((f) => ({
        filename: f.originalname,
        content: f.buffer,
    }));

    const limite = creerLimiteEnvois();
    const resultats = await Promise.allSettled(
        utilisateurs.map((u) => limite(async () => {
            await envoiMail(u.mail, sujet, "mailAdherents",
                {
                    prenom: u.prenom,
                    subject: sujet,
                    corps,
                    liens,
                    piecesJointes: attachments,
                },
                null,
                attachments
            );
        }))
    );

    const echecs = resultats.filter((r) => r.status === "rejected");
    if (echecs.length > 0) {
        const texte = `${echecs.length}/${utilisateurs.length} mails non envoyés`;
        logger.error({ type: "ENVOI_MAIL_ADHERENTS_ECHECS", erreurs: echecs.map((e) => e.reason?.message) }, texte);
        return res.json({ etat: true, detail: texte });
    } else {
        return res.json({ etat: true, detail: `${utilisateurs.length} mails envoyés` });
    }
}, "controleurEnvoiMailAdherents", "Erreur lors de l'envoi du mail aux adhérents");