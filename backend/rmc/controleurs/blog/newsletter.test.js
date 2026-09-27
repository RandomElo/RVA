import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";

import { appeler, intercepterMails } from "../testsUtilitaires.js";
import { canvaVisualisation, enregistrerNewsletter, recupererNewsletter } from "./newsletter.js";

// Aucun appel réseau ni lancement de Chromium : fetch est remplacé à chaque test,
// et les cas couverts s'arrêtent tous avant la capture puppeteer
const mailsEnvoyes = intercepterMails();
const fetchOriginal = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = fetchOriginal;
    mailsEnvoyes.length = 0;
    mock.timers.reset();
    mock.restoreAll();
});

const interdireFetch = () => {
    globalThis.fetch = async () => {
        throw new Error("appel réseau inattendu");
    };
};

// Réponses successives de fetch : [redirection, oEmbed]
const simulerFetch = (...reponses) => {
    const appels = [];
    globalThis.fetch = async (url) => {
        appels.push(url);
        const reponse = reponses[appels.length - 1];
        if (!reponse) throw new Error("appel réseau inattendu");
        return reponse;
    };
    return appels;
};

// canvaVisualisation

test("canvaVisualisation : url non textuelle, 400", async () => {
    interdireFetch();
    const res = await appeler(canvaVisualisation, { query: {} });
    assert.equal(res.statut, 400);
});

test("canvaVisualisation : url mal formée ou hors Canva refusée sans requête", async () => {
    interdireFetch();
    const cas = [
        ["pas une url", "URL incorrecte"],
        ["https://exemple.fr/design", "Cette URL n'est pas un lien Canva valide"],
        ["http://www.canva.com/design/x", "Cette URL n'est pas un lien Canva valide"],
        ["https://canva.com.exemple.fr/design", "Cette URL n'est pas un lien Canva valide"],
    ];
    for (const [url, detail] of cas) {
        const res = await appeler(canvaVisualisation, { query: { url } });
        assert.deepEqual(res.corps, { etat: true, detail: { recuperer: false, detail } }, url);
    }
});

test("canvaVisualisation : redirection vers un domaine tiers refusée avant oEmbed", async () => {
    const appels = simulerFetch({ url: "https://malveillant.exemple/page" });
    const res = await appeler(canvaVisualisation, { query: { url: "https://canva.link/abc" } });
    assert.deepEqual(res.corps, { etat: true, detail: { recuperer: false, detail: "Redirection vers un domaine non autorisé" } });
    assert.equal(appels.length, 1);
});

test("canvaVisualisation : oEmbed indisponible", async () => {
    simulerFetch({ url: "https://www.canva.com/design/x/view" }, { ok: false });
    const res = await appeler(canvaVisualisation, { query: { url: "https://canva.link/abc" } });
    assert.deepEqual(res.corps, { etat: true, detail: { recuperer: false, detail: "Aperçu Canva indisponible" } });
});

test("canvaVisualisation : aperçu oEmbed renvoyé", async () => {
    const appels = simulerFetch(
        { url: "https://www.canva.com/design/x/view" },
        {
            ok: true,
            async json() {
                return { html: "<iframe>" };
            },
        },
    );
    const res = await appeler(canvaVisualisation, { query: { url: "https://canva.link/abc" } });
    assert.deepEqual(res.corps, { etat: true, detail: { recuperer: true, detail: { html: "<iframe>" } } });
    assert.equal(appels[1], "https://www.canva.com/_oembed?url=" + encodeURIComponent("https://www.canva.com/design/x/view"));
});

// enregistrerNewsletter

const newsletter = (valeurs) => ({
    titre: "Newsletter Octobre 2026",
    categorie: "newsletter",
    url: "newsletter-octobre-2026",
    urlCanva: "https://www.canva.com/design/x/view",
    datePublication: "2026-10-01",
    ...valeurs,
});

const fauxArticles = ({ titrePris = false, urlPrise = false } = {}) => ({
    crees: [],
    async findOne({ where }) {
        if (where.titre && titrePris) return { id: 1 };
        if (where.url && urlPrise) return { id: 1 };
        return null;
    },
    async create(donnees) {
        this.crees.push(donnees);
    },
});

const enregistrer = async (valeurs, options) => {
    const Articles = fauxArticles(options);
    const res = await appeler(enregistrerNewsletter, { body: { article: newsletter(valeurs) }, Articles });
    return { res, Articles };
};

const refus = (detail) => ({ etat: true, detail: { article: false, detail } });

test("enregistrerNewsletter : champ manquant ou catégorie incorrecte refusé", async () => {
    interdireFetch();
    for (const valeurs of [{ titre: undefined }, { urlCanva: undefined }, { categorie: "course" }]) {
        const { res, Articles } = await enregistrer(valeurs);
        assert.deepEqual(res.corps, refus("Merci de renseigner tous les champs obligatoires."));
        assert.equal(Articles.crees.length, 0);
    }
});

test("enregistrerNewsletter : lien Canva hors domaine ou non https refusé", async () => {
    interdireFetch();
    for (const urlCanva of ["pas une url", "http://www.canva.com/design/x", "https://canva.site/x", "https://exemple.fr"]) {
        const { res } = await enregistrer({ urlCanva });
        assert.deepEqual(res.corps, refus("Lien Canva non valide."), urlCanva);
    }
});

test("enregistrerNewsletter : date invalide ou passée refusée", async () => {
    interdireFetch();
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-27T12:00:00Z") });
    assert.deepEqual((await enregistrer({ datePublication: "01/10/2026" })).res.corps, refus("Date invalide."));
    assert.deepEqual((await enregistrer({ datePublication: "2026-09-26" })).res.corps, refus("Date déjà passée."));
});

test("enregistrerNewsletter : titre ou chemin hors format refusé", async () => {
    interdireFetch();
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-27T12:00:00Z") });
    assert.deepEqual((await enregistrer({ titre: "Newsletter octobre 2026" })).res.corps, refus("Le titre n'est pas au format demandé."));
    assert.deepEqual((await enregistrer({ url: "newsletter-Octobre-2026" })).res.corps, refus("Le chemin d'accès n'est pas au format demandé."));
});

test("enregistrerNewsletter : titre ou chemin déjà utilisé refusé", async () => {
    interdireFetch();
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-27T12:00:00Z") });
    assert.deepEqual((await enregistrer({}, { titrePris: true })).res.corps, refus("Un article a déjà ce titre."));
    assert.deepEqual((await enregistrer({}, { urlPrise: true })).res.corps, refus("Un article a déjà ce chemin d'accès."));
});

test("enregistrerNewsletter : échecs Canva (résolution, oEmbed, iframe) avant toute capture", async () => {
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-27T12:00:00Z") });
    const cas = [
        [[{ url: "" }], "Impossible de résoudre le lien Canva."],
        [[{ url: "https://www.canva.com/design/x/view" }, { ok: false }], "Aperçu Canva indisponible."],
        [
            [
                { url: "https://www.canva.com/design/x/view" },
                {
                    ok: true,
                    async json() {
                        return { html: "<div></div>" };
                    },
                },
            ],
            "Impossible d'extraire l'iframe du design Canva.",
        ],
    ];
    for (const [reponses, detail] of cas) {
        simulerFetch(...reponses);
        const { res, Articles } = await enregistrer();
        assert.deepEqual(res.corps, refus(detail));
        assert.equal(Articles.crees.length, 0);
    }
    assert.equal(mailsEnvoyes.length, 0);
});

// recupererNewsletter

test("recupererNewsletter : chemin manquant 400, non connecté 403, nom dangereux 400", async () => {
    assert.equal((await appeler(recupererNewsletter, { params: {}, idUtilisateur: 1 })).statut, 400);
    const nonConnecte = await appeler(recupererNewsletter, { params: { chemin: "newsletter-octobre-2026.jpg" } });
    assert.equal(nonConnecte.statut, 403);
    // Ce message déclenche la déconnexion automatique côté frontend (useRequete)
    assert.deepEqual(nonConnecte.corps, { etat: false, detail: "Vous n'êtes pas connecté" });
    for (const chemin of ["../../.env", ".env", "a/b.jpg"]) {
        assert.equal((await appeler(recupererNewsletter, { params: { chemin }, idUtilisateur: 1 })).statut, 400, chemin);
    }
});

test("recupererNewsletter : fichier absent, 404", async () => {
    mock.method(fs, "readFile", async () => {
        throw Object.assign(new Error("absent"), { code: "ENOENT" });
    });
    const res = await appeler(recupererNewsletter, { params: { chemin: "newsletter-octobre-2026.jpg" }, idUtilisateur: 1 });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

test("recupererNewsletter : Content-Type déduit de l'extension du fichier", async () => {
    mock.method(fs, "readFile", async () => Buffer.from("image"));
    const cas = [
        ["newsletter-octobre-2026.jpg", "image/jpeg"],
        ["newsletter-octobre-2026.webp", "image/webp"],
    ];
    for (const [chemin, type] of cas) {
        const res = await appeler(recupererNewsletter, { params: { chemin }, idUtilisateur: 1 });
        assert.equal(res.statut, 200);
        assert.equal(res.enTetes["content-type"], type, chemin);
        assert.deepEqual(res.corps, Buffer.from("image"));
    }
});

test("enregistrerNewsletter : article absent ou non objet, 400", async () => {
    interdireFetch();
    for (const body of [{}, { article: "texte" }]) {
        const Articles = fauxArticles();
        const res = await appeler(enregistrerNewsletter, { body, Articles });
        assert.equal(res.statut, 400);
        assert.deepEqual(res.corps, { etat: false, detail: "Requête incorrecte" });
        assert.equal(Articles.crees.length, 0);
    }
});
