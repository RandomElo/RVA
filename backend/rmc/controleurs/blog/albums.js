import { Op } from "sequelize";
import gestionErreur from "../../middlewares/gestionErreur.js";
import { validerDatePublicationFuture } from "./validationDate.js";

// Une seule requête pour toutes les photos ; lève une erreur nommant la première absente
async function verifierPhotosExistent(req, photos) {
    const chemins = photos.map((p) => p.chemin);
    if (chemins.length === 0) return;
    const trouvees = await req.Images.findAll({ where: { nomFichier: { [Op.in]: chemins } }, attributes: ["nomFichier"], raw: true });
    const noms = new Set(trouvees.map((p) => p.nomFichier));
    const manquante = chemins.find((c) => !noms.has(c));
    if (manquante !== undefined) throw new Error(`Photo introuvable : ${manquante}`);
}

// Liste de photos d'album : objets { chemin, legende } avec deux chaînes
const estListePhotos = (photos) => Array.isArray(photos) && photos.every(
    (photo) =>
        photo !== null &&
        typeof photo === "object" &&
        typeof photo.chemin === "string" &&
        typeof photo.legende === "string"
);

export const creeAlbum = gestionErreur(async (req, res) => {
    const { photosAlbum, article } = req.body;
    // photosAlbum null ou absent reste accepté (album vide)
    if (!article || typeof article !== "object" || (photosAlbum != null && !estListePhotos(photosAlbum))) {
        return res.status(400).json({ etat: false, detail: "Requête incorrecte" });
    }
    const { titre, categorie, url, datePublication, description, imageUrl } = article;

    if (typeof titre !== "string" || typeof description !== "string" || typeof categorie !== "string" || typeof url !== "string" || typeof datePublication !== "string" || categorie !== "album_photo") {
        return res.json({ etat: true, detail: { article: false, detail: "Merci de renseigner tous les champs obligatoires." } });
    }

    // Vérification de la date
    const erreurDate = validerDatePublicationFuture(datePublication);
    if (erreurDate) {
        return res.json({ etat: true, detail: { article: false, detail: erreurDate } });
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


    // Album sans photo : null (valeur initiale du formulaire) traité comme une liste vide
    const photos = photosAlbum ?? [];
    try {
        await verifierPhotosExistent(req, photos);
    } catch (error) {
        return res.json({
            etat: true, detail: {
                article: false,
                detail: error instanceof Error ? error.message : "Photo introuvable"
            }
        })
    }

    const contenuHtml = JSON.stringify(photos);
    await req.Articles.create({ type: "publie", titre, categorie, url, datePublication, description, imageUrl, contenuHtml })

    return res.json({ etat: true, detail: { article: true, detail: `Album enregistré avec succès.`, donnees: "/article/" + url }, });

}, "controleurCreeAlbum", "Erreur lors de la création de l'album")

export const recupererAlbum = gestionErreur(async (req, res) => {
    const { url } = req.query

    if (!url) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }
    const album = await req.Articles.findOne({ where: { url, categorie: "album_photo" }, attributes: ["contenuHtml"], raw: true })
    if (!album) {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" });
    }
    return res.json({ etat: true, detail: album })
}, "controleurRecupererAlbum", "Erreur lors de la récupération des données de l'album")

export const modifierAlbum = gestionErreur(async (req, res) => {
    const { url, images } = req.body;

    if (!url || !estListePhotos(images)) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const album = await req.Articles.findOne({ where: { url, categorie: "album_photo" } })
    if (!album) {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" });
    }

    try {
        await verifierPhotosExistent(req, images);

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