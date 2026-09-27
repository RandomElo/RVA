import envoiMail from "../../../fonctions/mailer/mailer.service.js";
import gestionErreur from "../../middlewares/gestionErreur.js";
import { Op } from "sequelize";

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
        res.json({
            etat: true,
            detail: { article: false, detail: "Merci de renseigner tous les champs obligatoires." },
        });
        return { ok: false };
    }

    const verificationTitre = await req.Articles.findOne({ where: { titre, type: "publie" }, raw: true })
    if (mode !== "modification" && verificationTitre) {
        res.json({
            etat: true,
            detail: { article: false, detail: "Un article a déjà ce titre." },
        });
        return { ok: false };
    }

    const verificationLien = await req.Articles.findOne({ where: { url, type: "publie" }, raw: true })
    if (mode !== "modification" && verificationLien) {
        res.json({
            etat: true,
            detail: { article: false, detail: "Un article a déjà ce lien." },
        });
        return { ok: false };
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

        res.json({ etat: true, detail: { article: true, detail: `Article ${mode == "creation" ? "enregistré" : "modifié"} avec succès.`, donnees }, });
        return { ok: true, donnees };
    }

    return { ok: true };
}

// Contrôleurs
export const cree = gestionErreur(async (req, res) => {
    const { article, statut } = req.body
    if (!article || !statut) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    await enregistrerArticle(req, res, "creation", article, statut)

}, "controleurCreeArticle", "Erreur lors de l'enregistrement de l'article")

export const recupererArticle = gestionErreur(async (req, res) => {
    const { url } = req.params;

    if (!url) {
        return res.status(400).json({
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
        return res.status(400).json({
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
        return res.status(400).json({
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
        return res.status(400).json({
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

export const suggestion = gestionErreur(async (req, res) => {
    const { article } = req.body
    if (!article) {
        return res.status(400).json({
            etat: false,
            detail: "Requête incorrecte",
        });
    }

    const resultat = await enregistrerArticle(req, res, "creation", article, "suggestion")
    // Un administrateur a déjà reçu la réponse d'enregistrement : pas de mail de suggestion
    if (!resultat.ok || res.headersSent) return;

    const utilisateur = await req.Utilisateurs.findByPk(req.idUtilisateur, { raw: true })

    await envoiMail(process.env.EMAIL_ADMINISTRATEUR, "Proposition d'article – Running Vincennes Association", "suggestionArticle", {
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        titre: article.titre,
        url: process.env.IP_FRONTEND + "/administration/modifier-article/" + article.url
    })

    return res.json({ etat: true, detail: { article: true, detail: `Suggestion envoyé avec succès.` }, });

}, "controleurSuggestionArticle", "Erreur lors de l'enregistrement de la suggestion")