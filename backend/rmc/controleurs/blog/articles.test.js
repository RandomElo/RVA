import { test, afterEach, mock } from "node:test";
import { Op } from "sequelize";
import assert from "node:assert/strict";

import { appeler, intercepterMails } from "../testsUtilitaires.js";
import { cree, modifier, recupererArticle, recupererArticleAdmin, recupererQlqArticles, recupererTousArticles, suggestion, supprimer } from "./articles.js";

const fauxArticles = (article) => ({ async findOne() { return article; } });

test("recupererArticle : url inconnue (404)", async () => {
    const res = await appeler(recupererArticle, { params: { url: "inexistant" }, Articles: fauxArticles(null) });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

test("recupererArticle : article publié renvoyé", async () => {
    const article = { type: "publie", titre: "T", categorie: "course", imageUrl: "/i.webp", datePublication: "2026-01-01", contenuHtml: "<p>x</p>" };
    const res = await appeler(recupererArticle, { params: { url: "t" }, Articles: fauxArticles(article) });
    assert.equal(res.statut, 200);
    assert.equal(res.corps.etat, true);
    assert.equal(res.corps.detail.titre, "T");
});
const mailsEnvoyes = intercepterMails();
afterEach(() => {
    mailsEnvoyes.length = 0;
    mock.timers.reset();
});

test("recupererArticle : brouillon, publication future ou actu interne non connecté, 404", async () => {
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-27T12:00:00Z") });
    const base = { type: "publie", titre: "T", categorie: "course", datePublication: "2026-01-01", contenuHtml: "" };
    for (const article of [
        { ...base, type: "brouillon" },
        { ...base, datePublication: "2026-12-01" },
        { ...base, categorie: "actu_interne" },
    ]) {
        const res = await appeler(recupererArticle, { params: { url: "t" }, Articles: fauxArticles(article) });
        assert.equal(res.statut, 404);
    }
});

test("recupererArticle : actu interne visible une fois connecté", async () => {
    const article = { type: "publie", titre: "T", categorie: "actu_interne", datePublication: "2026-01-01", contenuHtml: "" };
    const res = await appeler(recupererArticle, { params: { url: "t" }, Articles: fauxArticles(article), idUtilisateur: 1 });
    assert.equal(res.statut, 200);
});

test("recupererArticle : url manquante, 400", async () => {
    const res = await appeler(recupererArticle, { params: {}, Articles: fauxArticles(null) });
    assert.equal(res.statut, 400);
});

const articlesListe = () => ({
    options: [],
    async findAll(options) {
        this.options.push(options);
        return [];
    },
});

test("recupererTousArticles : non connecté, actus internes et newsletters exclues", async () => {
    const Articles = articlesListe();
    await appeler(recupererTousArticles, { Articles });
    assert.deepEqual(Articles.options[0].where.categorie, { [Op.notIn]: ["actu_interne", "newsletter"] });
    assert.equal(Articles.options[0].where.type, "publie");
});

test("recupererTousArticles : connecté, pas de filtre de catégorie", async () => {
    const Articles = articlesListe();
    await appeler(recupererTousArticles, { Articles, idUtilisateur: 1 });
    assert.equal(Articles.options[0].where.categorie, undefined);
});

test("recupererQlqArticles : nombre absent ou non numérique, 400", async () => {
    for (const query of [{}, { nbrArticles: "abc" }]) {
        const res = await appeler(recupererQlqArticles, { query, Articles: articlesListe() });
        assert.equal(res.statut, 400);
    }
});

test("recupererQlqArticles : limite transmise à la requête", async () => {
    const Articles = articlesListe();
    const res = await appeler(recupererQlqArticles, { query: { nbrArticles: "3" }, Articles });
    assert.deepEqual(res.corps, { etat: true, detail: [] });
    assert.equal(Articles.options[0].limit, "3");
});

test("recupererArticleAdmin : url manquante 400, inconnue 404, brouillon renvoyé", async () => {
    assert.equal((await appeler(recupererArticleAdmin, { params: {}, Articles: fauxArticles(null) })).statut, 400);
    assert.equal((await appeler(recupererArticleAdmin, { params: { url: "x" }, Articles: fauxArticles(null) })).statut, 404);
    const brouillon = { id: 4, type: "brouillon", titre: "T", description: "D", categorie: "course", imageUrl: null, datePublication: "2026-12-01", contenuHtml: "" };
    const res = await appeler(recupererArticleAdmin, { params: { url: "t" }, Articles: fauxArticles(brouillon) });
    assert.deepEqual(res.corps, { etat: true, detail: { ...brouillon, url: "t" } });
});

// Enregistrement

const contenuArticle = (valeurs) => ({ titre: "Titre", categorie: "course", url: "titre", contenuHtml: "<p>x</p>", datePublication: "2026-10-01", ...valeurs });

// Articles factice : doublons de titre / d'url simulés selon where
const articlesEnregistrement = ({ titrePris = false, urlPrise = false } = {}) => ({
    crees: [],
    misesAJour: [],
    async findOne({ where }) {
        if (where.titre && titrePris) return { id: 9 };
        if (where.url && urlPrise) return { id: 9 };
        return null;
    },
    async findAll() {
        return [{ titre: "Existant" }];
    },
    async create(donnees) {
        this.crees.push(donnees);
    },
    async update(donnees, options) {
        this.misesAJour.push({ donnees, options });
        return [1];
    },
});

const utilisateursRole = (role) => ({
    async findByPk() {
        return { role, prenom: "Eloi", nom: "Test" };
    },
});

test("cree : champ obligatoire manquant refusé", async () => {
    const Articles = articlesEnregistrement();
    const res = await appeler(cree, { body: { article: contenuArticle({ contenuHtml: "" }), statut: "publie" }, Articles });
    assert.deepEqual(res.corps, { etat: true, detail: { article: false, detail: "Merci de renseigner tous les champs obligatoires." } });
    assert.equal(Articles.crees.length, 0);
});

test("cree : titre ou lien déjà publié refusé", async () => {
    const cas = [
        [{ titrePris: true }, "Un article a déjà ce titre."],
        [{ urlPrise: true }, "Un article a déjà ce lien."],
    ];
    for (const [doublon, detail] of cas) {
        const Articles = articlesEnregistrement(doublon);
        const res = await appeler(cree, { body: { article: contenuArticle(), statut: "publie" }, Articles, Utilisateurs: utilisateursRole("administrateur") });
        assert.deepEqual(res.corps, { etat: true, detail: { article: false, detail } });
        assert.equal(Articles.crees.length, 0);
    }
});

test("cree : article publié par un administrateur, lien vers l'article renvoyé", async () => {
    const Articles = articlesEnregistrement();
    const res = await appeler(cree, { body: { article: contenuArticle(), statut: "publie" }, Articles, Utilisateurs: utilisateursRole("administrateur"), idUtilisateur: 1 });
    assert.deepEqual(res.corps, { etat: true, detail: { article: true, detail: "Article enregistré avec succès.", donnees: "/article/titre" } });
    assert.equal(Articles.crees[0].type, "publie");
});

test("cree : brouillon, liste d'administration renvoyée", async () => {
    const Articles = articlesEnregistrement();
    const res = await appeler(cree, { body: { article: contenuArticle(), statut: "brouillon" }, Articles, Utilisateurs: utilisateursRole("administrateur"), idUtilisateur: 1 });
    assert.deepEqual(res.corps.detail.donnees, [{ titre: "Existant" }]);
    assert.equal(Articles.crees[0].type, "brouillon");
});

test("modifier : id absent ou non numérique, 400", async () => {
    for (const id of [undefined, "abc"]) {
        const res = await appeler(modifier, { body: { article: contenuArticle(), statut: "publie", id }, Articles: articlesEnregistrement() });
        assert.equal(res.statut, 400);
    }
});

test("modifier : titre inchangé accepté, mise à jour par id", async () => {
    const Articles = articlesEnregistrement({ titrePris: true, urlPrise: true });
    const res = await appeler(modifier, { body: { article: contenuArticle(), statut: "publie", id: 4 }, Articles, Utilisateurs: utilisateursRole("administrateur"), idUtilisateur: 1 });
    assert.equal(res.corps.detail.detail, "Article modifié avec succès.");
    assert.deepEqual(Articles.misesAJour[0].options, { where: { id: 4 } });
    assert.equal(Articles.crees.length, 0);
});

test("modifier : aucun article avec cet id, 404 sans message de succès", async () => {
    const Articles = { ...articlesEnregistrement(), async update() { return [0]; } };
    const res = await appeler(modifier, { body: { article: contenuArticle(), statut: "publie", id: 99 }, Articles, Utilisateurs: utilisateursRole("administrateur"), idUtilisateur: 1 });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

test("supprimer : article inconnu, 404", async () => {
    const res = await appeler(supprimer, { body: { nom: "Inconnu" }, Articles: fauxArticles(null) });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

test("supprimer : succès, liste d'administration renvoyée", async () => {
    const Articles = {
        ...articlesEnregistrement(),
        detruits: [],
        async findOne() {
            return { titre: "T" };
        },
        async destroy(options) {
            this.detruits.push(options);
        },
    };
    const res = await appeler(supprimer, { body: { nom: "T" }, Articles });
    assert.deepEqual(res.corps, { etat: true, detail: [{ titre: "Existant" }] });
    assert.deepEqual(Articles.detruits, [{ where: { titre: "T" } }]);
});

test("suggestion : adhérent, enregistrée en suggestion et notifiée par mail", async () => {
    const Articles = articlesEnregistrement();
    const res = await appeler(suggestion, { body: { article: contenuArticle() }, Articles, Utilisateurs: utilisateursRole("adherent"), idUtilisateur: 2 });
    assert.deepEqual(res.corps, { etat: true, detail: { article: true, detail: "Suggestion envoyé avec succès." } });
    assert.equal(Articles.crees[0].type, "suggestion");
    assert.equal(mailsEnvoyes.length, 1);
    assert.equal(mailsEnvoyes[0].template, "suggestionArticle");
});

test("suggestion : administrateur, réponse d'enregistrement sans mail", async () => {
    const Articles = articlesEnregistrement();
    const res = await appeler(suggestion, { body: { article: contenuArticle() }, Articles, Utilisateurs: utilisateursRole("administrateur"), idUtilisateur: 1 });
    // Réponse d'enregistrement conservée : aucune seconde réponse « suggestion envoyée »
    assert.equal(res.corps.detail.article, true);
    assert.equal(res.corps.detail.detail, "Article enregistré avec succès.");
    assert.equal(mailsEnvoyes.length, 0);
});

test("suggestion : titre déjà pris, ni enregistrement ni mail", async () => {
    const Articles = articlesEnregistrement({ titrePris: true });
    const res = await appeler(suggestion, { body: { article: contenuArticle() }, Articles, Utilisateurs: utilisateursRole("adherent"), idUtilisateur: 2 });
    assert.equal(res.corps.detail.detail, "Un article a déjà ce titre.");
    assert.equal(Articles.crees.length, 0);
    assert.equal(mailsEnvoyes.length, 0);
});

// Chaque chemin d'enregistrement répond : aucune requête ne reste sans réponse
test("cree : appelé par un adhérent, 403 sans enregistrement", async () => {
    const Articles = articlesEnregistrement();
    const res = await appeler(cree, { body: { article: contenuArticle(), statut: "publie" }, Articles, Utilisateurs: utilisateursRole("adherent"), idUtilisateur: 2 });
    assert.equal(res.statut, 403);
    assert.deepEqual(res.corps, { etat: false, detail: "Accès interdit" });
    assert.equal(res.headersSent, true);
    assert.equal(Articles.crees.length, 0);
});

test("cree : compte supprimé entre-temps, 403 « Vous n'êtes pas connecté » sans enregistrement", async () => {
    const Articles = articlesEnregistrement();
    const Utilisateurs = { async findByPk() { return null; } };
    const res = await appeler(cree, { body: { article: contenuArticle(), statut: "publie" }, Articles, Utilisateurs, idUtilisateur: 1 });
    assert.equal(res.statut, 403);
    assert.deepEqual(res.corps, { etat: false, detail: "Vous n'êtes pas connecté" });
    assert.equal(Articles.crees.length, 0);
});

test("suggestion : compte supprimé avant l'envoi du mail, 403 sans mail", async () => {
    const Articles = articlesEnregistrement();
    const reponses = [{ role: "adherent" }, null];
    const Utilisateurs = { async findByPk() { return reponses.shift(); } };
    const res = await appeler(suggestion, { body: { article: contenuArticle() }, Articles, Utilisateurs, idUtilisateur: 2 });
    assert.equal(res.statut, 403);
    assert.deepEqual(res.corps, { etat: false, detail: "Vous n'êtes pas connecté" });
    assert.equal(mailsEnvoyes.length, 0);
});
