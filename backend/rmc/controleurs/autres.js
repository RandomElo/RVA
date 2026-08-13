import gestionErreur from "../middlewares/gestionErreur.js";
import envoiMail from "../../fonctions/mailer/mailer.service.js";
import { Op } from "sequelize";
import { genererNombre } from "../../fonctions/utilitaires/genererChaine.js";
import bdd from "../../bdd/bdd.js";
// Fonction de résolution de chemin asynchrone avec fallback récursif
const resoudreCheminPage = async (nomPage) => {
    let cheminFormate = path.normalize(nomPage).replace(/^(\.\.[\/\\])+/, "");
    if (!cheminFormate.endsWith(".json")) {
        cheminFormate += ".json";
    }

    // 1. Essai direct (si le sous-dossier est fourni dans l'URL)
    let cheminComplet = path.join(CHEMIN_DOSSIER_TEXTES, cheminFormate);

    try {
        await fs.access(cheminComplet);
    } catch {
        // 2. Fallback : Recherche récursive dans toute l'arborescence de /textes
        const nomFichierSeul = path.basename(cheminFormate);
        const cheminTrouve = await trouverFichierRecursif(CHEMIN_DOSSIER_TEXTES, nomFichierSeul);

        if (!cheminTrouve) {
            const err = new Error("PAGE_INTROUVABLE");
            err.code = "ENOENT";
            throw err;
        }

        cheminComplet = cheminTrouve;
    }

    // Sécurité anti-traversal
    if (!cheminComplet.startsWith(CHEMIN_DOSSIER_TEXTES)) {
        throw new Error("ACCES_INTERDIT");
    }

    const cheminRelatif = path.relative(CHEMIN_DOSSIER_TEXTES, cheminComplet).replace(/\\/g, "/");
    return { cheminComplet, cheminRelatif };
};

export const gestionToken = gestionErreur(async (req, res) => {
    const { token } = req.body
    if (!token) {
        return res.status(401).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const tokenBdd = await req.Tokens.findOne({ where: { token } })
    if (!tokenBdd) {
        return res.json({ etat: true, detail: { token: false, detail: "Le lien est obsolète ou inexistant." } })
    }

    if (tokenBdd.dateExpiration && new Date(tokenBdd.dateExpiration) < new Date()) {
        return res.json({ etat: true, detail: { token: false, detail: "Le lien n'est plus valide" } })
    }

    if (tokenBdd.type == "lienConnexion") {
        if (req.idUtilisateur) {
            return res.json({ etat: true, detail: { token: false, detail: "Vous êtes déjà authentifié avec un compte, merci de vous déconnecter avant de réessayer." } })
        }

        const utilisateur = await req.Utilisateurs.findByPk(tokenBdd.details.idUtilisateur)
        if (!utilisateur) {
            return res.json({ etat: true, detail: { token: false, detail: "Compte inexistant." } })
        }


        const chaine = genererNombre(9)
        await req.Tokens.create({ token: chaine, type: "codeConnexion", details: { idUtilisateur: utilisateur.id }, dateExpiration: new Date(Date.now() + 15 * 60 * 1000) })
        await tokenBdd.destroy()
        return res.json({ etat: true, detail: { token: true, detail: { aAfficher: chaine } } });
    }
    if (tokenBdd.type == "lienDesinscriptionNewsletter") {
        const utilisateur = await req.Utilisateurs.findByPk(tokenBdd.details.idUtilisateur)
        if (!utilisateur) {
            return res.json({ etat: true, detail: { token: false, detail: "Compte inexistant." } })
        }
        await utilisateur.update({ recevoirNewsletter: false })
        return res.json({ etat: true, detail: { token: true, detail: "Vous êtes désinscrit de la newsletter." } })
    }


}, "controleurGestionToken", "Erreur lors de la gestion du lien")

export const envoyerMailContact = gestionErreur(async (req, res) => {
    const { nom, mail, message } = req.body
    if (!nom || !mail || !message) {
        return res.status(401).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const regexNom = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;
    const regexMail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    // Bug corrigé : "|" (OR bit-à-bit) remplacé par "||" (OR logique)
    if (!nom || !mail || !message) {
        return res.status(401).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    if (!regexNom.test(nom)) {
        return res.json({ etat: true, detail: { message: false, detail: "Nom invalide" } });
    }

    if (!regexMail.test(mail)) {
        return res.json({ etat: true, detail: { message: false, detail: "Mail invalide" } });
    }

    if (message.trim().length < 5 || message.trim().length > 3000) {
        return res.json({ etat: true, detail: { message: false, detail: "Message invalide (trop long ou trop court)" } });
    }

    // Adresse de réception des messages du formulaire de contact (à définir en variable d'env)
    const destinataireAdmin = process.env.MAIL_CONTACT_CLUB;

    await envoiMail(destinataireAdmin, `Nouveau message de contact — ${nom}`, "contact", { nom, mail, message, }, mail);

    return res.json({ etat: true, detail: { message: true } });
}, "controleurEnvoyerMailContact", "Erreur lors de l'envoi du mail de contact.")

// Données administration
export const detailsInterfaceAdministration = gestionErreur(async (req, res) => {
    const nbrAdherents = await req.Utilisateurs.count({ where: { role: "adherent", derniereConnexion: { [Op.ne]: null, }, } })

    const invitationsEnAttente = await req.Utilisateurs.count({ where: { role: "adherent", derniereConnexion: { [Op.eq]: null, }, } })

    const nbrArticles = await req.Articles.count({ where: { type: "publie" } })

    const prochaineCourse = await req.Courses.findOne({
        attributes: ["nom", "date"],
        order: [["date", "ASC"]],
        raw: true
    })

    const nbrCoursesSuggestion = await req.Courses.count({ where: { etat: 'suggestion' } })
    const nbrArticlesSuggestion = await req.Articles.count({ where: { type: 'suggestion' } })

    return res.json({ etat: true, detail: { nbrAdherents, invitationsEnAttente, nbrArticles, prochaineCourse, nbrCoursesSuggestion, nbrArticlesSuggestion } })
}, "controleurDetailsInterfaceAdministration", "Erreur lors de la récupératin des détails de l'interface d'administration")

export const healthCheck = gestionErreur(async (req, res) => {
    await bdd.sequelize.authenticate();

    // 2. Si la BDD répond, renvoyer un statut 200 OK
    return res.status(200).json({
        status: 'ok',
        message: 'Backend et base de données fonctionnels',
        timestamp: new Date().toISOString()
    });

}, "controleurHealthCheck", "Erreur lors du health check")