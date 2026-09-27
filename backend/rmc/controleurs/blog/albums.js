import gestionErreur from "../../middlewares/gestionErreur.js";

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
        return res.status(400).json({
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

    if (!url || !Array.isArray(images) ||
        !images.every(
            (image) =>
                image !== null &&
                typeof image === "object" &&
                typeof image.chemin === "string" &&
                typeof image.legende === "string"
        )) {
        return res.status(400).json({
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