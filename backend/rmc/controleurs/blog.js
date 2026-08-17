import fs from "fs/promises";
import path from "path";
import envoiMail from "../../fonctions/mailer/mailer.service.js";
import gestionErreur from "../middlewares/gestionErreur.js";
import { Op } from "sequelize";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url"
import { genererChaine } from "../../fonctions/utilitaires/genererChaine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function capturerCanvaEnImage(urlIframe) {
    const navigateur = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
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
// Fonctions BDD
async function recupererBaseArticlesAdministrateur(req) {
    return await req.Articles.findAll({
        attributes: ["type", "titre", "categorie", "imageUrl", "url", "datePublication"], order: [["datePublication", "ASC"]]
        , raw: true
    })
}
async function recupererBaseArticle(req, limit = null) {
    const date = new Date();
    const where = {
        type: "publie",
        datePublication: {
            [Op.lte]: date,
        },
    };

    // Si l'utilisateur n'est pas connecté, on exclut les actualités internes
    if (!req.idUtilisateur) {
        where.categorie = {
            [Op.notIn]: ["actu_interne", "newsletter"],
        };
    }

    return await req.Articles.findAll({
        where,
        attributes: [
            "type",
            "titre",
            "categorie",
            "imageUrl",
            "url",
            "datePublication",
            "description",
        ],
        order: [["datePublication", "ASC"]],
        ...(limit !== null && { limit }),
        raw: true,
    });
}
// il suffit de modifier statut pour faire un truc en suggestion
async function enregistrerArticle(req, res, mode, article, statut, id) {
    const { titre, categorie, url, imageUrl, contenuHtml, datePublication, description } = article
    if (!(titre && categorie && url && contenuHtml && datePublication)) {
        return res.json({
            etat: true,
            detail: { article: false, detail: "Merci de renseigner tous les champs obligatoires." },
        });
    }

    const verificationTitre = await req.Articles.findOne({ where: { titre, type: "publie" }, raw: true })
    if (mode !== "modification" && verificationTitre) {
        return res.json({
            etat: true,
            detail: { article: false, detail: "Un article a déjà ce titre." },
        });
    }

    const verificationLien = await req.Articles.findOne({ where: { url, type: "publie" }, raw: true })
    if (mode !== "modification" && verificationLien) {
        return res.json({
            etat: true,
            detail: { article: false, detail: "Un article a déjà ce lien." },
        });
    }

    const corps = { type: statut, titre, categorie, url, imageUrl, contenuHtml, datePublication, description }
    if (mode == "creation") {
        await req.Articles.create(corps)
    } else {
        await req.Articles.update(corps, { where: { id } })
    }

    const utilisateur = await req.Utilisateurs.findByPk(req.idUtilisateur)
    if (utilisateur.role !== "adherent") {
        const donnees = statut == "publie" ? "/article/" + url : await recupererBaseArticlesAdministrateur(req)

        return res.json({ etat: true, detail: { article: true, detail: `Article ${mode == "creation" ? "enregistré" : "modifié"} avec succès.`, donnees }, });
    }
}

// Contrôleurs
export const cree = gestionErreur(async (req, res) => {
    const { article, statut } = req.body
    if (!article || !statut) {
        return res.status(401).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    await enregistrerArticle(req, res, "creation", article, statut)

}, "controleurCreeArticle", "Erreur lors de l'enregistrement de l'article")

export const recupererArticle = gestionErreur(async (req, res) => {
    const { url } = req.params;

    if (!url) {
        return res.status(401).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const article = await req.Articles.findOne({ where: { url }, raw: true })

    if (article.type == "brouillon" || new Date(article.datePublication) > new Date() || (article.categorie == "actu_interne" && !req.idUtilisateur)) {
        return res.status(404).json({ etat: false, detail: "404" })
    }

    const { titre, categorie, imageUrl, datePublication, contenuHtml } = article;
    return res.json({ etat: true, detail: { titre, categorie, imageUrl, datePublication, contenuHtml } })

}, "controleurRecupererArticle", "Erreur lors de la récupération de l'article")

export const recupererTousArticles = gestionErreur(async (req, res) => {
    return res.json({ etat: true, detail: await recupererBaseArticle(req) })
}, "controleurRecupererTousArticles", "Erreur lors de la récupération des articles")

export const recupererQlqArticles = gestionErreur(async (req, res) => {
    const { nbrArticles } = req.query

    if (!nbrArticles || isNaN(nbrArticles)) {
        return res.status(401).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    return res.json({ etat: true, detail: await recupererBaseArticle(req, nbrArticles) })
}, "controleurRecupererQlqArticles", "Erreur lors de la récupération des articles pour la page d'accueil")

export const recupererTousArticlesAdmin = gestionErreur(async (req, res) => {
    return res.json({ etat: true, detail: await recupererBaseArticlesAdministrateur(req) })
}, "recupererTousArticlesAdmin", "Erreur lors de la récupération de tous les articles")

export const recupererArticleAdmin = gestionErreur(async (req, res) => {
    const { url } = req.params;

    if (!url) {
        return res.status(401).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const article = await req.Articles.findOne({ where: { url }, raw: true })

    if (!article) {
        return res.status(404).json({ etat: false, detail: "404" })
    }

    const { id, type, titre, description, categorie, imageUrl, datePublication, contenuHtml } = article;
    return res.json({ etat: true, detail: { id, type, titre, description, url, categorie, imageUrl, datePublication, contenuHtml } })

}, "controleurRecupererArticleAdmin", "Erreur lors de la récupération de l'article")

export const modifier = gestionErreur(async (req, res) => {
    const { article, statut, id } = req.body
    if (!article || !statut || !id || isNaN(id)) {
        return res.status(401).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }
    await enregistrerArticle(req, res, "modification", article, statut, id)
}, "controleurModifierArticle", "Erreur lors de la modification de l'article")

export const supprimer = gestionErreur(async (req, res) => {
    const { nom } = req.body
    if (!nom) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const article = await req.Articles.findOne({ where: { titre: nom }, raw: true })
    if (!article) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }
    await req.Articles.destroy({ where: { titre: nom } })

    return res.json({ etat: true, detail: await recupererBaseArticlesAdministrateur(req) })
}, "controleurSupprimerArticle", "Erreur lors de la suppression de l'article")

export const canvaVisualisation = gestionErreur(async (req, res) => {
    const { url } = req.query;

    if (typeof url !== "string") {
        return res.status(401).json({ etat: false, detail: "Requête incorrecte" });
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
        console.error("Erreur capture Canva", e);
        return res.json({ etat: true, detail: { article: false, detail: "Échec de la capture du design Canva." } });
    }

    const extension = "jpg";

    // 4. Écriture sur disque : backend/medias/newsletters/<url>.<ext>
    const dossierMedias = path.resolve(__dirname, "../../medias/newsletters");
    await fs.mkdir(dossierMedias, { recursive: true });

    const nomFichier = `${url}.${extension}`;
    await fs.writeFile(path.join(dossierMedias, nomFichier), tampon);

    cheminImageRelatif = nomFichier; // stocké tel quel en bdd, comme cheminTrombinoscope

    const corps = { type: "publie", categorie: "newsletter", titre, url, contenuHtml: cheminImageRelatif, datePublication, description: '' }

    await req.Articles.create(corps)

    // Envoi des mails de notification
    const utilisateurs = await req.Utilisateurs.findAll({
        where: { role: "adherent", recevoirNewsletter: true, derniereConnexion: { [Op.ne]: null, }, },
        attributes: ["id", "prenom", "mail"],
        raw: true,
    });


    const resultats = await Promise.allSettled(
        utilisateurs.map(async (u) => {
            // Vérification de la présence d'un token
            const tokenBdd = await req.Tokens.findOne({ where: { type: "lienDesinscriptionNewsletter", details: { idUtilisateur: u.id } }, attributes: ["token"], raw: true })
            let token;
            if (!tokenBdd) {
                const chaine = genererChaine(9)
                await req.Tokens.create({ token: chaine, type: "lienDesinscriptionNewsletter", details: { idUtilisateur: u.id } })
                token = chaine;
            }
            envoiMail(u.mail, titre + " – Running Vincennes Association", "newsletter", {
                prenom: u.prenom,
                titre,
                lien: process.env.IP_FRONTEND + "/article/" + url,
                lien_desinscription: process.env.IP_FRONTEND + "/t/" + token
            })
        })
    );

    const echecs = resultats.filter(r => r.status === "rejected");
    if (echecs.length > 0) {
        console.error(`${echecs.length}/${utilisateurs.length} mails non envoyés`, echecs);
    }
    return res.json({ etat: true, detail: { article: true, detail: `Article enregistré avec succès.`, donnees: "/article/" + url }, });

}, "controleurEnregistrerNewsletter", "Erreur lors de l'enregistrement de la newsletter")

export const suggestion = gestionErreur(async (req, res) => {
    const { article } = req.body
    if (!article) {
        return res.status(401).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    await enregistrerArticle(req, res, "creation", article, "suggestion")

    const lien = "/administrateur/modifier-article/" + article.url

    const utilisateur = await req.Utilisateurs.findByPk(req.idUtilisateur, { raw: true })

    await envoiMail(process.env.EMAIL_ADMINISTRATEUR, "Proposition d'article – Running Vincennes Association", "suggestionArticle", {
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        titre: article.titre,
        url: process.env.IP_FRONTEND + "/administration/modifier-article/" + article.url
    })

    return res.json({ etat: true, detail: { article: true, detail: `Suggestion envoyé avec succès.` }, });

}, "controleurSuggestionArticle", "Erreur lors de l'enregistrement de la suggestion")

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

    const cheminFichier = path.resolve(__dirname, "../../medias/newsletters", chemin);
    const buffer = await fs.readFile(cheminFichier);
    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.send(buffer);
}, "controleurRecupererNewsletter", "Erreur lors de la récupération de la newsletter.");

export const creeAlbum = gestionErreur(async (req, res) => {
    // faire la verification
    const { photosAlbum } = req.body;
    const { titre, categorie, url, datePublication, description, imageUrl } = req.body.article;

    if (typeof titre !== "string" || typeof description !== "string" || typeof categorie !== "string" || typeof url !== "string" || typeof datePublication !== "string" || categorie !== "album_photo") {
        return res.json({ etat: true, detail: { article: false, detail: "Merci de renseigner tous les champs obligatoires." } });
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
    const titreBdd = await req.Articles.findOne({ where: { titre }, raw: true })
    if (titreBdd) {
        return res.json({ etat: true, detail: { article: false, detail: "Un article a déjà ce titre." } });
    }

    // Vérification chemin
    const cheminBdd = await req.Articles.findOne({ where: { url }, raw: true })
    if (cheminBdd) {
        return res.json({ etat: true, detail: { article: false, detail: "Un article a déjà ce chemin d'accès." } });
    }

    // Vérification image couverture
    if (imageUrl) {
        const imageCouverture = await req.Images.findOne({ where: { nomFichier: imageUrl } })
        if (!imageCouverture) {
            return res.json({ etat: true, detail: { article: false, detail: "Photo de couverture introuvable" } })
        }
    }


    try {
        await Promise.all(
            photosAlbum.map(async (p) => {
                const photo = await req.Images.findOne({
                    where: { nomFichier: p.chemin }
                });

                if (!photo) {
                    throw new Error(`Photo introuvable : ${p.chemin}`);
                }

                return photo;
            })
        );

        // Suite du traitement...
    } catch (error) {
        return res.json({
            etat: true, detail: {
                article: false,
                detail: error instanceof Error ? error.message : "Photo introuvable"
            }
        })
    }

    const contenuHtml = JSON.stringify(photosAlbum);
    await req.Articles.create({ type: "publie", titre, categorie, url, datePublication, description, imageUrl, contenuHtml })

    return res.json({ etat: true, detail: { article: true, detail: `Album enregistré avec succès.`, donnees: "/article/" + url }, });

}, "controleurCreeAlbum", "Erreur lors de la création de l'album")

export const recupererAlbum = gestionErreur(async (req, res) => {
    const { url } = req.query

    if (!url) {
        return res.status(401).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }
    const album = await req.Articles.findOne({ where: { url, categorie: "album_photo" }, attributes: ["contenuHtml"], raw: true })
    if (!album) {
        return res.status(404).json({
            etat: false,
            detail: "Album introuvable",
        });
    }
    return res.json({ etat: true, detail: album })
}, "controleurRecupererAlbum", "Erreur lors de la récupération des données de l'album")

export const modifierAlbum = gestionErreur(async (req, res) => {
    const { url, images } = req.body;

    if (!url ||!Array.isArray(images) ||
        !images.every(
            (image) =>
                image !== null &&
                typeof image === "object" &&
                typeof image.chemin === "string" &&
                typeof image.legende === "string"
        )) {
        return res.status(401).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const album = await req.Articles.findOne({ where: { url, categorie: "album_photo" } })
    if (!album) {
        return res.status(404).json({
            etat: false,
            detail: "Album introuvable",
        });
    }

    try {
        await Promise.all(
            images.map(async (p) => {
                const photo = await req.Images.findOne({
                    where: { nomFichier: p.chemin }
                });

                if (!photo) {
                    throw new Error(`Photo introuvable : ${p.chemin}`);
                }

                return photo;
            })
        );

    } catch (error) {
        return res.json({
            etat: true, detail: {
                album: false,
                detail: error instanceof Error ? error.message : "Photo introuvable"
            }
        })
    }

    const contenuHtml = JSON.stringify(images);
    await album.update({ contenuHtml })

    return res.json({ etat: true, detail: { album: true, detail: "Album mis à jour avec succès" } })

}, "controleurModifierAlbum", "Erreur lors de la modificaton de l'album")