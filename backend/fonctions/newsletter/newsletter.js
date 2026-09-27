import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Op } from "sequelize";
import envoiMail from "../mailer/mailer.service.js";
import { creerLimiteEnvois } from "../mailer/limiteEnvois.js";
import { genererChaine } from "../utilitaires/genererChaine.js";
import { logger } from "../utilitaires/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Images des newsletters : backend/medias/newsletters/<url>.<ext>
export const DOSSIER_NEWSLETTERS = path.resolve(__dirname, "../../medias/newsletters");

/**
 * Écrit l'image capturée sur disque puis crée l'article de newsletter publié.
 * Le nom du fichier est stocké tel quel dans contenuHtml, comme cheminTrombinoscope.
 */
export async function enregistrerArticleNewsletter(Articles, { titre, url, datePublication }, image) {
    const extension = "jpg";

    await fs.mkdir(DOSSIER_NEWSLETTERS, { recursive: true });

    const nomFichier = `${url}.${extension}`;
    await fs.writeFile(path.join(DOSSIER_NEWSLETTERS, nomFichier), image);

    const corps = { type: "publie", categorie: "newsletter", titre, url, contenuHtml: nomFichier, datePublication, description: '' };
    await Articles.create(corps);
    return corps;
}

/**
 * Envoie la notification de nouvelle newsletter aux adhérents abonnés, avec un lien de
 * désinscription par utilisateur (token existant réutilisé, sinon créé).
 * Les échecs d'envoi sont journalisés sans interrompre les autres envois.
 * Renvoie { total, echecs }.
 */
export async function notifierAbonnesNewsletter({ Utilisateurs, Tokens }, { titre, url }) {
    const utilisateurs = await Utilisateurs.findAll({
        // where: { role: "adherent", recevoirNewsletter: true, derniereConnexion: { [Op.ne]: null, }, },
        where: { role: "adherent", recevoirNewsletter: true },
        attributes: ["id", "prenom", "mail"],
        raw: true,
    });

    // Tokens de désinscription existants, récupérés en une seule requête
    const tokensExistants = await Tokens.findAll({
        where: { type: "lienDesinscriptionNewsletter", "details.idUtilisateur": { [Op.in]: utilisateurs.map((u) => u.id) } },
        attributes: ["token", "details"],
        raw: true,
    });
    const tokenParUtilisateur = new Map(tokensExistants.map((t) => [t.details.idUtilisateur, t.token]));

    const limite = creerLimiteEnvois();
    const resultats = await Promise.allSettled(
        utilisateurs.map((u) => limite(async () => {
            let token = tokenParUtilisateur.get(u.id);
            if (!token) {
                token = genererChaine(9);
                await Tokens.create({ token, type: "lienDesinscriptionNewsletter", details: { idUtilisateur: u.id } });
            }
            await envoiMail(u.mail, titre + " – Running Vincennes Association", "newsletter", {
                prenom: u.prenom,
                titre,
                lien: process.env.IP_FRONTEND + "/article/" + url,
                lien_desinscription: process.env.IP_FRONTEND + "/t/" + token
            });
        }))
    );

    const echecs = resultats.filter(r => r.status === "rejected");
    if (echecs.length > 0) {
        logger.error({ type: "NEWSLETTER_ECHECS_ENVOI", erreurs: echecs.map((e) => e.reason?.message) }, `${echecs.length}/${utilisateurs.length} mails non envoyés`);
    }
    return { total: utilisateurs.length, echecs: echecs.length };
}
