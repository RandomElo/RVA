import fs from "fs/promises";
import path from "path";
import envoiMail from "../../../fonctions/mailer/mailer.service.js";
import gestionErreur from "../../middlewares/gestionErreur.js";
import { Op } from "sequelize";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url"
import { genererChaine } from "../../../fonctions/utilitaires/genererChaine.js";
import { estNomFichierSur } from "../../../fonctions/utilitaires/validation.js";
import { creerLimiteEnvois } from "../../../fonctions/mailer/limiteEnvois.js";
import { logger } from "../../../fonctions/utilitaires/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function capturerCanvaEnImage(urlIframe) {
    const navigateur = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });

    try {
        const page = await navigateur.newPage();
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        );
        await page.setViewport({ width: 1280, height: 720 });

        await page.goto(urlIframe, { waitUntil: "networkidle0", timeout: 30000 });

        // Le design Canva se dessine en JS/canvas, on laisse un peu de marge
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return await page.screenshot({ type: "webp", quality: 90 });
    } finally {
        await navigateur.close();
    }
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

    const enTetesNavigateur = {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    };

    // 1. Résoudre le lien court vers l'URL canonique du design.
    const reponseRedirection = await fetch(urlObjet.toString(), {
        redirect: "follow",
        headers: enTetesNavigateur,
    });

    if (!reponseRedirection.url) {
        return res.json({ etat: true, detail: { recuperer: false, detail: "Impossible de résoudre le lien Canva" } });
    }

    // 2. Revalider l'URL canonique obtenue après redirection (Canva pourrait
    //    rediriger vers un domaine tiers, ex. contenu malveillant / open redirect)
    let urlFinale;
    try {
        urlFinale = new URL(reponseRedirection.url);
    } catch (e) {
        return res.json({ etat: true, detail: { recuperer: false, detail: "URL de redirection invalide" } });
    }

    if (!estUrlCanvaAutorisee(urlFinale)) {
        return res.json({ etat: true, detail: { recuperer: false, detail: "Redirection vers un domaine non autorisé" } });
    }

    // 3. Appeler oEmbed avec l'URL canonique
    const reponse = await fetch(
        `https://www.canva.com/_oembed?url=${encodeURIComponent(urlFinale.toString())}`,
        { headers: enTetesNavigateur }
    );

    if (!reponse.ok) {
        return res.json({ etat: true, detail: { recuperer: false, detail: "Aperçu Canva indisponible" } });
    }

    const data = await reponse.json();
    return res.json({ etat: true, detail: { recuperer: true, detail: data } });
}, "controleurVisualisationCanva", "Erreur lors de la récupération du Canva.");


/**
 * Vérifie que l'URL utilise HTTPS et pointe vers un (sous-)domaine Canva
 * officiel, afin d'éviter que le serveur ne serve de proxy pour récupérer
 * n'importe quelle URL arbitraire (SSRF).
 */
function estUrlCanvaAutorisee(urlObjet) {
    if (urlObjet.protocol !== "https:") {
        return false;
    }

    const hote = urlObjet.hostname.toLowerCase();

    const domainesAutorises = [
        "canva.com",
        "canva.link",
        "canva.site", // domaine utilisé pour certains liens courts Canva
    ];

    return domainesAutorises.some(
        (domaine) => hote === domaine || hote.endsWith(`.${domaine}`)
    );
}
export const enregistrerNewsletter = gestionErreur(async (req, res) => {
    const { titre, categorie, url, urlCanva, datePublication, } = req.body.article;

    if (typeof titre !== "string" || typeof categorie !== "string" || typeof url !== "string" || typeof urlCanva !== "string" || typeof datePublication !== "string" || categorie !== "newsletter") {
        return res.json({ etat: true, detail: { article: false, detail: "Merci de renseigner tous les champs obligatoires." } });
    }

    let urlValide = false;

    try {
        const u = new URL(urlCanva);

        urlValide = u.protocol === "https:" && (u.hostname === "www.canva.com" || u.hostname === "canva.com" || u.hostname === "canva.link");
    } catch {
        urlValide = false;
    }

    if (!urlValide) {
        return res.json({ etat: true, detail: { article: false, detail: "Lien Canva non valide." } });

    }

    // Vérificationd de la date
    const dateValide = /^\d{4}-\d{2}-\d{2}$/.test(datePublication) && !Number.isNaN(Date.parse(datePublication));

    if (!dateValide) {
        return res.json({ etat: true, detail: { article: false, detail: "Date invalide." } });
    }

    if ((new Date(datePublication)).setHours(0, 0, 0, 0) < (new Date()).setHours(0, 0, 0, 0)) {
        return res.json({ etat: true, detail: { article: false, detail: "Date déjà passée." } });
    }

    // Vérification titre
    const regexTitre = /^Newsletter\s(Janvier|Février|Mars|Avril|Mai|Juin|Juillet|Août|Septembre|Octobre|Novembre|Décembre)\s\d{4}$/;
    if (!regexTitre.test(titre)) {
        return res.json({ etat: true, detail: { article: false, detail: "Le titre n'est pas au format demandé." } });
    }

    const titreBdd = await req.Articles.findOne({ where: { titre }, raw: true })
    if (titreBdd) {
        return res.json({ etat: true, detail: { article: false, detail: "Un article a déjà ce titre." } });
    }

    // Vérification chemin
    const regexChemin = /^newsletter-(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)-\d{4}$/;
    if (!regexChemin.test(url)) {
        return res.json({ etat: true, detail: { article: false, detail: "Le chemin d'accès n'est pas au format demandé." } });
    }
    const cheminBdd = await req.Articles.findOne({ where: { url }, raw: true })
    if (cheminBdd) {
        return res.json({ etat: true, detail: { article: false, detail: "Un article a déjà ce chemin d'accès." } });
    }

    // Téléchargement de l'image Canva pour ne plus dépendre de Canva à l'affichage
    const enTetesNavigateur = {
        "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.canva.com/",
    };

    let cheminImageRelatif;
    // 1. Résoudre le lien vers l'URL canonique (nécessaire pour l'oEmbed)
    const reponseRedirection = await fetch(urlCanva, {
        redirect: "follow",
        headers: enTetesNavigateur,
    });
    if (!reponseRedirection.url) {
        return res.json({ etat: true, detail: { article: false, detail: "Impossible de résoudre le lien Canva." } });
    }

    // 2. Appeler l'oEmbed pour récupérer le html d'intégration
    const reponseOembed = await fetch(
        `https://www.canva.com/_oembed?url=${encodeURIComponent(reponseRedirection.url)}`,
        { headers: enTetesNavigateur }
    );
    if (!reponseOembed.ok) {
        return res.json({ etat: true, detail: { article: false, detail: "Aperçu Canva indisponible." } });
    }

    const dataOembed = await reponseOembed.json();
    const correspondanceSrc = dataOembed.html?.match(/src="([^"]+)"/);
    const urlIframe = correspondanceSrc?.[1];

    if (!urlIframe) {
        return res.json({ etat: true, detail: { article: false, detail: "Impossible d'extraire l'iframe du design Canva." } });
    }

    // 3. Rendre l'iframe et capturer l'image
    let tampon;
    try {
        tampon = await capturerCanvaEnImage(urlIframe);
    } catch (e) {
        logger.error({ type: "CANVA_CAPTURE_ERREUR", erreur: e?.message }, "Erreur capture Canva");
        return res.json({ etat: true, detail: { article: false, detail: "Échec de la capture du design Canva." } });
    }

    const extension = "jpg";

    // 4. Écriture sur disque : backend/medias/newsletters/<url>.<ext>
    const dossierMedias = path.resolve(__dirname, "../../../medias/newsletters");
    await fs.mkdir(dossierMedias, { recursive: true });

    const nomFichier = `${url}.${extension}`;
    await fs.writeFile(path.join(dossierMedias, nomFichier), tampon);

    cheminImageRelatif = nomFichier; // stocké tel quel en bdd, comme cheminTrombinoscope

    const corps = { type: "publie", categorie: "newsletter", titre, url, contenuHtml: cheminImageRelatif, datePublication, description: '' }

    await req.Articles.create(corps)

    // Envoi des mails de notification
    const utilisateurs = await req.Utilisateurs.findAll({
        // where: { role: "adherent", recevoirNewsletter: true, derniereConnexion: { [Op.ne]: null, }, },
        where: { role: "adherent", recevoirNewsletter: true },
        attributes: ["id", "prenom", "mail"],
        raw: true,
    });


    // Tokens de désinscription existants, récupérés en une seule requête
    const tokensExistants = await req.Tokens.findAll({
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
                token = genererChaine(9)
                await req.Tokens.create({ token, type: "lienDesinscriptionNewsletter", details: { idUtilisateur: u.id } })
            }
            await envoiMail(u.mail, titre + " – Running Vincennes Association", "newsletter", {
                prenom: u.prenom,
                titre,
                lien: process.env.IP_FRONTEND + "/article/" + url,
                lien_desinscription: process.env.IP_FRONTEND + "/t/" + token
            })
        }))
    );

    const echecs = resultats.filter(r => r.status === "rejected");
    if (echecs.length > 0) {
        logger.error({ type: "NEWSLETTER_ECHECS_ENVOI", erreurs: echecs.map((e) => e.reason?.message) }, `${echecs.length}/${utilisateurs.length} mails non envoyés`);
    }
    return res.json({ etat: true, detail: { article: true, detail: `Article enregistré avec succès.`, donnees: "/article/" + url }, });

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
            detail: "Accès interdit",
        });
    }

    if (!estNomFichierSur(chemin)) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const cheminFichier = path.resolve(__dirname, "../../../medias/newsletters", chemin);
    const buffer = await fs.readFile(cheminFichier);
    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.send(buffer);
}, "controleurRecupererNewsletter", "Erreur lors de la récupération de la newsletter.");