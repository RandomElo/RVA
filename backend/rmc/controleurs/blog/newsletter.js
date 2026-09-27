import fs from "fs/promises";
import path from "path";
import gestionErreur from "../../middlewares/gestionErreur.js";
import { estNomFichierSur } from "../../../fonctions/utilitaires/validation.js";
import { CODES_ERREUR_CANVA, ErreurCanva, estUrlCanvaAutorisee, resoudreEtCapturerCanva, resoudreOembedCanva } from "../../../fonctions/canva/canva.js";
import { DOSSIER_NEWSLETTERS, enregistrerArticleNewsletter, notifierAbonnesNewsletter } from "../../../fonctions/newsletter/newsletter.js";
import { validerDatePublicationFuture } from "./validationDate.js";

// Type MIME des images de newsletter selon l'extension du fichier enregistré
const TYPES_IMAGES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

// Messages renvoyés au client pour chaque erreur Canva, selon le contrôleur
const MESSAGES_VISUALISATION_CANVA = {
    [CODES_ERREUR_CANVA.RESOLUTION_IMPOSSIBLE]: "Impossible de résoudre le lien Canva",
    [CODES_ERREUR_CANVA.REDIRECTION_INVALIDE]: "URL de redirection invalide",
    [CODES_ERREUR_CANVA.DOMAINE_NON_AUTORISE]: "Redirection vers un domaine non autorisé",
    [CODES_ERREUR_CANVA.OEMBED_INDISPONIBLE]: "Aperçu Canva indisponible",
};

const MESSAGES_ENREGISTREMENT_CANVA = {
    [CODES_ERREUR_CANVA.RESOLUTION_IMPOSSIBLE]: "Impossible de résoudre le lien Canva.",
    [CODES_ERREUR_CANVA.REDIRECTION_INVALIDE]: "URL de redirection invalide.",
    [CODES_ERREUR_CANVA.DOMAINE_NON_AUTORISE]: "Redirection vers un domaine non autorisé.",
    [CODES_ERREUR_CANVA.OEMBED_INDISPONIBLE]: "Aperçu Canva indisponible.",
    [CODES_ERREUR_CANVA.IFRAME_INTROUVABLE]: "Impossible d'extraire l'iframe du design Canva.",
    [CODES_ERREUR_CANVA.CAPTURE_ECHEC]: "Échec de la capture du design Canva.",
};

const REGEX_TITRE_NEWSLETTER = /^Newsletter\s(Janvier|Février|Mars|Avril|Mai|Juin|Juillet|Août|Septembre|Octobre|Novembre|Décembre)\s\d{4}$/;
const REGEX_CHEMIN_NEWSLETTER = /^newsletter-(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)-\d{4}$/;

// Le lien saisi doit pointer vers canva.com ou canva.link en https (plus strict que estUrlCanvaAutorisee)
function estLienCanvaNewsletterValide(urlCanva) {
    try {
        const u = new URL(urlCanva);
        return u.protocol === "https:" && (u.hostname === "www.canva.com" || u.hostname === "canva.com" || u.hostname === "canva.link");
    } catch {
        return false;
    }
}

// Refus métier : la requête aboutit (200) mais l'article n'est pas enregistré
const refusNewsletter = (detail) => ({ ok: false, statut: 200, corps: { etat: true, detail: { article: false, detail } } });

// Validation sans réponse HTTP : { ok: true, donnees } ou { ok: false, statut, corps } à renvoyer tel quel
async function validerNewsletter(req, article) {
    if (!article || typeof article !== "object") {
        return { ok: false, statut: 400, corps: { etat: false, detail: "Requête incorrecte" } };
    }
    const { titre, categorie, url, urlCanva, datePublication, } = article;

    if (typeof titre !== "string" || typeof categorie !== "string" || typeof url !== "string" || typeof urlCanva !== "string" || typeof datePublication !== "string" || categorie !== "newsletter") {
        return refusNewsletter("Merci de renseigner tous les champs obligatoires.");
    }

    if (!estLienCanvaNewsletterValide(urlCanva)) {
        return refusNewsletter("Lien Canva non valide.");
    }

    const erreurDate = validerDatePublicationFuture(datePublication);
    if (erreurDate) {
        return refusNewsletter(erreurDate);
    }

    if (!REGEX_TITRE_NEWSLETTER.test(titre)) {
        return refusNewsletter("Le titre n'est pas au format demandé.");
    }
    const titreBdd = await req.Articles.findOne({ where: { titre }, raw: true });
    if (titreBdd) {
        return refusNewsletter("Un article a déjà ce titre.");
    }

    if (!REGEX_CHEMIN_NEWSLETTER.test(url)) {
        return refusNewsletter("Le chemin d'accès n'est pas au format demandé.");
    }
    const cheminBdd = await req.Articles.findOne({ where: { url }, raw: true });
    if (cheminBdd) {
        return refusNewsletter("Un article a déjà ce chemin d'accès.");
    }

    return { ok: true, donnees: { titre, url, urlCanva, datePublication } };
}

export const canvaVisualisation = gestionErreur(async (req, res) => {
    const { url } = req.query;

    if (typeof url !== "string") {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte" });
    }

    // --- Validation stricte de l'URL ---
    let urlObjet;
    try {
        urlObjet = new URL(url);
    } catch (e) {
        return res.json({ etat: true, detail: { recuperer: false, detail: "URL incorrecte" } });
    }

    if (!estUrlCanvaAutorisee(urlObjet)) {
        return res.json({ etat: true, detail: { recuperer: false, detail: "Cette URL n'est pas un lien Canva valide" } });
    }
    // --- Fin validation ---

    try {
        const { data } = await resoudreOembedCanva(urlObjet.toString());
        return res.json({ etat: true, detail: { recuperer: true, detail: data } });
    } catch (e) {
        if (e instanceof ErreurCanva && MESSAGES_VISUALISATION_CANVA[e.code]) {
            return res.json({ etat: true, detail: { recuperer: false, detail: MESSAGES_VISUALISATION_CANVA[e.code] } });
        }
        throw e;
    }
}, "controleurVisualisationCanva", "Erreur lors de la récupération du Canva.");

export const enregistrerNewsletter = gestionErreur(async (req, res) => {
    const validation = await validerNewsletter(req, req.body.article);
    if (!validation.ok) return res.status(validation.statut).json(validation.corps);
    const donnees = validation.donnees;

    // Téléchargement de l'image Canva pour ne plus dépendre de Canva à l'affichage
    let image;
    try {
        image = await resoudreEtCapturerCanva(donnees.urlCanva);
    } catch (e) {
        if (e instanceof ErreurCanva && MESSAGES_ENREGISTREMENT_CANVA[e.code]) {
            return res.json(refusNewsletter(MESSAGES_ENREGISTREMENT_CANVA[e.code]).corps);
        }
        throw e;
    }

    await enregistrerArticleNewsletter(req.Articles, donnees, image);

    // Envoi des mails de notification
    await notifierAbonnesNewsletter(req, donnees);

    return res.json({ etat: true, detail: { article: true, detail: `Article enregistré avec succès.`, donnees: "/article/" + donnees.url }, });

}, "controleurEnregistrerNewsletter", "Erreur lors de l'enregistrement de la newsletter")

export const recupererNewsletter = gestionErreur(async (req, res) => {
    const { chemin } = req.params;

    if (!chemin) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    if (!req.idUtilisateur) {
        return res.status(403).json({
            etat: false,
            detail: "Vous n'êtes pas connecté",
        });
    }

    if (!estNomFichierSur(chemin)) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const cheminFichier = path.resolve(DOSSIER_NEWSLETTERS, chemin);
    let buffer;
    try {
        buffer = await fs.readFile(cheminFichier);
    } catch (erreur) {
        if (erreur?.code === "ENOENT") {
            return res.status(404).json({ etat: false, detail: "Ressource introuvable" });
        }
        throw erreur;
    }
    res.setHeader("Content-Type", TYPES_IMAGES[path.extname(chemin).toLowerCase()] ?? "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.send(buffer);
}, "controleurRecupererNewsletter", "Erreur lors de la récupération de la newsletter.");