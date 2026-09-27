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
// Refus métier : la requête aboutit (200) mais l'article n'est pas enregistré
const refusArticle = (detail) => ({ ok: false, statut: 200, corps: { etat: true, detail: { article: false, detail } } });

// Validation sans réponse HTTP : { ok: true, donnees } ou { ok: false, statut, corps } à renvoyer tel quel
// Titre et lien déjà publiés ne sont refusés que pour un nouvel article
async function validerArticle(req, article, { nouvelArticle }) {
    const { titre, categorie, url, imageUrl, contenuHtml, datePublication, description } = article
    if (!(titre && categorie && url && contenuHtml && datePublication)) {
        return refusArticle("Merci de renseigner tous les champs obligatoires.");
    }

    if (nouvelArticle) {
        const verificationTitre = await req.Articles.findOne({ where: { titre, type: "publie" }, raw: true })
        if (verificationTitre) return refusArticle("Un article a déjà ce titre.");

        const verificationLien = await req.Articles.findOne({ where: { url, type: "publie" }, raw: true })
        if (verificationLien) return refusArticle("Un article a déjà ce lien.");
    }

    return { ok: true, donnees: { titre, categorie, url, imageUrl, contenuHtml, datePublication, description } };
}

// Auteur de la requête : { ok: true, donnees: utilisateur } ou refus 403 à renvoyer tel quel
// Un adhérent ne peut que suggérer
async function verifierAuteur(req, { adherentAutorise }) {
    const utilisateur = await req.Utilisateurs.findByPk(req.idUtilisateur)
    // Compte supprimé depuis la vérification du cookie
    if (!utilisateur) {
        return { ok: false, statut: 403, corps: { etat: false, detail: "Vous n'êtes pas connecté" } };
    }
    if (utilisateur.role === "adherent" && !adherentAutorise) {
        return { ok: false, statut: 403, corps: { etat: false, detail: "Accès interdit" } };
    }
    return { ok: true, donnees: utilisateur };
}

// Réponse d'enregistrement côté administration : lien de l'article publié, sinon liste d'administration
async function repondreEnregistrement(req, res, corps, message) {
    const donnees = corps.type == "publie" ? "/article/" + corps.url : await recupererBaseArticlesAdministrateur(req)
    return res.json({ etat: true, detail: { article: true, detail: message, donnees }, });
}

// Contrôleurs
export const cree = gestionErreur(async (req, res) => {
    const { article, statut } = req.body

    const validation = await validerArticle(req, article, { nouvelArticle: true })
    if (!validation.ok) return res.status(validation.statut).json(validation.corps);

    const auteur = await verifierAuteur(req, { adherentAutorise: false })
    if (!auteur.ok) return res.status(auteur.statut).json(auteur.corps);

    // `statut` est enregistré comme type de l'article
    const corps = { type: statut, ...validation.donnees }
    await req.Articles.create(corps)
    return repondreEnregistrement(req, res, corps, "Article enregistré avec succès.")

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

    if (!article || article.type == "brouillon" || new Date(article.datePublication) > new Date() || (article.categorie == "actu_interne" && !req.idUtilisateur)) {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" })
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
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" })
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

    const validation = await validerArticle(req, article, { nouvelArticle: false })
    if (!validation.ok) return res.status(validation.statut).json(validation.corps);

    const auteur = await verifierAuteur(req, { adherentAutorise: false })
    if (!auteur.ok) return res.status(auteur.statut).json(auteur.corps);

    const corps = { type: statut, ...validation.donnees }
    const [nbModifies] = await req.Articles.update(corps, { where: { id } })
    if (nbModifies === 0) {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" });
    }
    return repondreEnregistrement(req, res, corps, "Article modifié avec succès.")
}, "controleurModifierArticle", "Erreur lors de la modification de l'article")

export const supprimer = gestionErreur(async (req, res) => {
    const { nom } = req.body

    const article = await req.Articles.findOne({ where: { titre: nom }, raw: true })
    if (!article) {
        return res.status(404).json({ etat: false, detail: "Ressource introuvable" });
    }
    await req.Articles.destroy({ where: { titre: nom } })

    return res.json({ etat: true, detail: await recupererBaseArticlesAdministrateur(req) })
}, "controleurSupprimerArticle", "Erreur lors de la suppression de l'article")

export const suggestion = gestionErreur(async (req, res) => {
    const { article } = req.body

    const validation = await validerArticle(req, article, { nouvelArticle: true })
    if (!validation.ok) return res.status(validation.statut).json(validation.corps);

    const auteur = await verifierAuteur(req, { adherentAutorise: true })
    if (!auteur.ok) return res.status(auteur.statut).json(auteur.corps);

    const corps = { type: "suggestion", ...validation.donnees }
    await req.Articles.create(corps)

    // Un administrateur reçoit la réponse d'enregistrement : pas de mail de suggestion
    if (auteur.donnees.role !== "adherent") {
        return repondreEnregistrement(req, res, corps, "Article enregistré avec succès.")
    }

    const utilisateur = await req.Utilisateurs.findByPk(req.idUtilisateur, { raw: true })
    if (!utilisateur) {
        return res.status(403).json({ etat: false, detail: "Vous n'êtes pas connecté" });
    }

    await envoiMail(process.env.EMAIL_ADMINISTRATEUR, "Proposition d'article – Running Vincennes Association", "suggestionArticle", {
        prenom: utilisateur.prenom,
        nom: utilisateur.nom,
        titre: article.titre,
        url: process.env.IP_FRONTEND + "/administration/modifier-article/" + article.url
    })

    return res.json({ etat: true, detail: { article: true, detail: `Suggestion envoyé avec succès.` }, });

}, "controleurSuggestionArticle", "Erreur lors de l'enregistrement de la suggestion")