import gestionErreur from "../middlewares/gestionErreur.js";
import path from "path";
import fs from 'fs/promises'
import { fileURLToPath } from "url";
import { DOSSIER_GALERIE, sauvegarderEnWebp } from "../../fonctions/utilitaires/enregistrementPhoto.js";
import { estNomFichierSur } from "../../fonctions/utilitaires/validation.js";
import { supprimerFichierSiExiste } from "../../fonctions/utilitaires/fichiers.js";
import { logger } from "../../fonctions/utilitaires/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Noms générés par sauvegarderEnWebp (randomUUID() + ".webp"), repérables directement dans le HTML des articles
const MOTIF_NOM_IMAGE_GENERE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.webp";
const REGEX_NOM_IMAGE_GENERE = new RegExp(`^${MOTIF_NOM_IMAGE_GENERE}$`);
const REGEX_NOMS_IMAGES_GENERES = new RegExp(MOTIF_NOM_IMAGE_GENERE, "g");

async function recupererImagesGalerie(req) {
    return await req.Images.findAll({
        where: { type: "galerie" },
        attributes: ["nomFichier", "alt"],
        raw: true
    })
}

async function recupererImages(req) {
    return await req.Images.findAll({
        attributes: ["nomFichier", "alt", "type"],
        raw: true
    })
}

export const ajouterGalerie = gestionErreur(async (req, res) => {
    const { alt } = req.body;

    // 1. Validation de tous les champs AVANT d'exécuter la conversion Sharp
    if (!alt) {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte : le champ 'alt' est requis" });
    }

    if (!req.file) {
        return res.status(400).json({ etat: false, detail: "Aucun fichier reçu" });
    }

    // 2. Conversion et écriture du fichier WebP sur disque
    const nomFichierWebp = await sauvegarderEnWebp(req.file.buffer, DOSSIER_GALERIE, 80);

    // 3. Enregistrement en BDD avec le bon nom de fichier WebP
    await req.Images.create({ nomFichier: nomFichierWebp, alt, type: "galerie" });

    return res.json({
        etat: true,
        detail: {
            donnees: req.query.mode === "galerie" ? await recupererImagesGalerie(req) : await recupererImages(req),
            notification: { titre: "Enregistrée", description: "Image correctement enregistrée" }
        }
    });

}, "controleurAjouterImage", "Erreur lors de l'ajout d'une image");

export const recupererGalerie = gestionErreur(async (req, res) => {
    return res.json({ etat: true, detail: await recupererImagesGalerie(req) })
}, "controleurRecupererImagesGalerie", "Erreur lors de la récupération des images")

export const recupererTout = gestionErreur(async (req, res) => {
    return res.json({ etat: true, detail: await recupererImages(req) })
}, "controleurRecupererImagesToutes", "Erreur lors de la récupération des images")

export const afficher = gestionErreur(async (req, res) => {
    const { nomFichier } = req.params

    if (!estNomFichierSur(nomFichier)) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const dossierGalerie = path.resolve(__dirname, "../../medias/galerie");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.sendFile(nomFichier, { root: dossierGalerie }, (erreur) => {
        if (erreur && !res.headersSent) {
            res.removeHeader("Cache-Control");
            res.status(erreur.status === 404 ? 404 : 500).json({ etat: false, detail: "Photo introuvable" });
        }
    });
}, "controleurAfficherPhotoGalerie", "Erreur lors de la récupération de la photo")

// Dossier des images du site : DOSSIER_IMAGES (Docker) ou frontend/public/img (local)
const CHEMIN_DOSSIER_IMAGES = path.resolve(
    process.env.DOSSIER_IMAGES || path.join(__dirname, "../../../frontend/public/img")
);

export const remplacer = gestionErreur(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ etat: false, detail: "Aucune image fournie." });
    }
    const { alt, nomFichier } = req.body;

    if (!alt || !estNomFichierSur(nomFichier)) {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte." });
    }

    const image = await req.Images.findOne({ where: { nomFichier }, raw: true });
    if (!image) {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" });
    }

    const chemin = path.resolve(CHEMIN_DOSSIER_IMAGES, nomFichier);
    const fichier = req.file.buffer;

    // 1. Vérification de la présence du fichier sur le disque
    try {
        await fs.access(chemin);
    } catch {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" });
    }

    // 2. Remplacement du fichier physique
    await fs.writeFile(chemin, fichier);

    return res.status(200).json({
        etat: true,
        detail: {
            donnees: await recupererImages(req),
            notification: { titre: "Remplacée", description: "Image remplacée avec succès." }
        }
    });

}, "controleurRemplacerImage", "Erreur lors du remplacement de l'image");

export const verifierUtilisationImagesDansArticles = gestionErreur(async (req, res) => {
    // 1. Récupération de toutes les images et des champs nécessaires des articles
    const images = await req.Images.findAll({ where: { type: "galerie" }, raw: true });
    const articles = await req.Articles.findAll({
        attributes: ['titre', 'url', 'contenuHtml'],
        raw: true
    });

    // 2. Index nomFichier -> articles utilisant l'image
    const utilisations = new Map(images.map((image) => [image.nomFichier, []]));
    // Les noms hors format UUID (anciens fichiers) restent cherchés par sous-chaîne
    const nomsNonGeneres = [...utilisations.keys()].filter((nom) => !REGEX_NOM_IMAGE_GENERE.test(nom));

    // 3. Un seul passage par article : extraction des noms d'images présents dans le HTML
    articles.forEach((article) => {
        if (!article.contenuHtml) return;

        const nomsTrouves = new Set();
        for (const [nom] of article.contenuHtml.matchAll(REGEX_NOMS_IMAGES_GENERES)) {
            nomsTrouves.add(nom);
        }
        nomsNonGeneres.forEach((nom) => {
            if (article.contenuHtml.includes(nom)) nomsTrouves.add(nom);
        });

        nomsTrouves.forEach((nom) => {
            utilisations.get(nom)?.push({
                titre: article.titre,
                url: article.url
            });
        });
    });

    const resultat = images.map((image) => ({
        nomFichier: image.nomFichier,
        detail: utilisations.get(image.nomFichier)
    }));

    return res.json({
        etat: true,
        detail: resultat
    });

}, "controleurVerifierUtilisationImages", "Erreur lors de la vérification de l'utilisation des images");

export const supprimerPhotoGalerie = gestionErreur(async (req, res) => {
    const { image } = req.body
    if (!estNomFichierSur(image)) {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte." });
    }

    // Seules les images de la galerie sont supprimables : les images système (bannière, coach) sont exclues
    const imageBdd = await req.Images.findOne({ where: { nomFichier: image, type: "galerie" } })
    if (!imageBdd) {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" });
    }

    const cheminFichier = path.join(path.resolve(__dirname, "../../medias/galerie"), image);
    await supprimerFichierSiExiste(cheminFichier);
    await imageBdd.destroy()
    return res.json({ etat: true, detail: { donnees: await recupererImages(req), notification: "Image supprimer avec succès." } })

}, "controleurSupprimerPhotoGalerie", "Erreur lors de la suppression de la photo")

export const modifierAlt = gestionErreur(async (req, res) => {
    const { nomFichier, alt } = req.body;

    if (typeof nomFichier !== "string" || typeof alt !== "string") {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte." });
    }

    const image = await req.Images.findOne({ where: { nomFichier } })
    if (!image) {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" });
    }

    await image.update({ alt })

    // Je doit mettre à jour les albums

    const articles = await req.Articles.findAll({
        where: { categorie: "album_photo" },
        attributes: ['id', 'titre', 'url', 'contenuHtml'],
    });

    for (const article of articles) {
        if (!article.contenuHtml) continue;

        // 1. Transformer le JSON string en tableau JavaScript ; un album mal formé est ignoré sans bloquer les autres
        let images;
        try {
            images = JSON.parse(article.contenuHtml);
        } catch (erreur) {
            logger.warn({ type: "ALBUM_CONTENU_INVALIDE", idArticle: article.id, erreur: erreur?.message }, `Contenu d'album illisible, légende non reportée : ${article.titre}`);
            continue;
        }
        if (!Array.isArray(images)) continue;

        // 2. Modifier la légende de l'image correspondante (comparaison exacte des chemins)
        let aEteModifie = false;
        images = images.map((img) => {
            if (img?.chemin === nomFichier) {
                aEteModifie = true;
                return { ...img, legende: alt };
            }
            return img;
        });

        // 3. Si une modification a eu lieu, mettre à jour la BDD
        if (aEteModifie) {
            article.contenuHtml = JSON.stringify(images);
            await article.save(); // Met à jour l'enregistrement en BDD
        }
    }

    return res.json({ etat: true, detail: await recupererImages(req) })
}, "controleurModifierAlt", "Erreur lors de la modification du texte alternatif")