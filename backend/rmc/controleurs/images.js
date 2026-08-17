import gestionErreur from "../middlewares/gestionErreur.js";
import path from "path";
import fs from 'fs/promises'
import { fileURLToPath } from "url";
import { DOSSIER_GALERIE, sauvegarderEnWebp } from "../../fonctions/utilitaires/enregistrementPhoto.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        return res.status(400).json({ erreur: "Requête incorrecte : le champ 'alt' est requis" });
    }

    if (!req.file) {
        return res.status(400).json({ erreur: "Aucun fichier reçu" });
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

    if (!nomFichier) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const chemin = path.resolve(__dirname, "../../medias/galerie", nomFichier);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.sendFile(chemin);
}, "controleurAfficherPhotoGalerie", "Erreur lors de la récupération de la photo")

// Au début de votre fichier de contrôleur
const CHEMIN_DOSSIER_IMAGES = path.resolve(
    process.env.DOSSIER_IMAGES || path.join(__dirname, "../../../frontend/public/img")
);

export const remplacer = gestionErreur(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ etat: false, detail: "Aucune image fournie." });
    }
    const { alt, nomFichier } = req.body;

    if (!alt || !nomFichier) {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte." });
    }

    const image = await req.Images.findOne({ where: { nomFichier }, raw: true });
    if (!image) {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte." });
    }

    // ✅ Utilisation du chemin dynamique géré par Docker / Local
    const chemin = path.resolve(CHEMIN_DOSSIER_IMAGES, nomFichier);
    const fichier = req.file.buffer;

    // 1. Vérification de la présence du fichier sur le disque
    try {
        await fs.access(chemin);
    } catch {
        return res.status(440).json({ etat: false, detail: "Le fichier à remplacer n'existe pas sur le serveur." });
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

    // 2. Traitement de chaque image
    const resultat = images.map((image) => {
        const nomFichier = image.nomFichier;
        const details = [];

        // Parcours de tous les articles pour cette image
        articles.forEach((article) => {
            // Vérification dans le contenu HTML de l'article
            const presenteDansContenu = article.contenuHtml && article.contenuHtml.includes(nomFichier);

            if (presenteDansContenu) {
                details.push({
                    titre: article.titre,
                    url: article.url
                });
            }
        });

        return {
            nomFichier: nomFichier,
            detail: details
        };
    });

    return res.json({
        etat: true,
        detail: resultat
    });

}, "controleurVerifierUtilisationImages", "Erreur lors de la vérification de l'utilisation des images");

export const supprimerPhotoGalerie = gestionErreur(async (req, res) => {
    const { image } = req.body
    if (!image) {
        return res.status(400).json({ erreur: "Requête incorrecte." });
    }

    const imageBdd = await req.Images.findOne({ where: { nomFichier: image } })
    if (!imageBdd) {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte." });
    }

    const cheminFichier = path.join(path.resolve(__dirname, "../../medias/galerie"), image);
    try {
        await fs.unlink(cheminFichier);
    } catch (err) {
        if (err.code !== "ENOENT") {
            throw err;
        }
    }
    await imageBdd.destroy()
    return res.json({ etat: true, detail: { donnees: await recupererImages(req), notification: "Image supprimer avec succès." } })

}, "controleurSupprimerPhotoGalerie", "Erreur lors de la suppression de la photo")

export const modifierAlt = gestionErreur(async (req, res) => {
    const { nomFichier, alt } = req.body;

    if (typeof nomFichier !== "string" || typeof alt !== "string") {
        return res.status(400).json({ erreur: "Requête incorrecte." });
    }

    const image = await req.Images.findOne({ where: { nomFichier } })
    if (!image) {
        return res.status(404).json({ erreur: "Image introuvable." });
    }

    await image.update({ alt })

    // Je doit mettre à jour les albums

    const articles = await req.Articles.findAll({
        where: { categorie: "album_photo" },
        attributes: ['id', 'titre', 'url', 'contenuHtml'],
    });

    for (const article of articles) {
        if (!article.contenuHtml) continue;

        if (article.contenuHtml.includes(nomFichier)) {
            // 1. Transformer le JSON string en tableau JavaScript
            let images = JSON.parse(article.contenuHtml);

            // 2. Modifier la légende de l'image correspondante
            let aEteModifie = false;
            images = images.map((img) => {
                if (img.chemin === nomFichier) {
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
    }

    return res.json({ etat: true, detail: await recupererImages(req) })
}, "controleurModifierAlt", "Erreur lors de la modification du texte alternatif")