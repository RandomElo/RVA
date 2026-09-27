import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { Op } from "sequelize";

import { appeler, instance } from "../testsUtilitaires.js";
import { creeAlbum, modifierAlbum, recupererAlbum } from "./albums.js";

afterEach(() => mock.timers.reset());

// 27/09/2026 à 22h00 à Paris (20h00 UTC)
const figerHorloge = (iso = "2026-09-27T20:00:00Z") => {
    mock.timers.enable({ apis: ["Date"], now: new Date(iso) });
};

// Images présentes en base ; findAll filtre sur nomFichier IN (...) et compte ses appels
const faussesImages = (noms) => ({
    appelsFindAll: [],
    appelsFindOne: 0,
    async findAll(options) {
        this.appelsFindAll.push(options);
        const demandes = options.where.nomFichier[Op.in];
        return noms.filter((n) => demandes.includes(n)).map((nomFichier) => ({ nomFichier }));
    },
    async findOne({ where }) {
        this.appelsFindOne++;
        return noms.includes(where.nomFichier) ? { nomFichier: where.nomFichier } : null;
    },
});

const fauxArticles = (album = null) => ({
    crees: [],
    async findOne() { return album; },
    async create(donnees) { this.crees.push(donnees); return donnees; },
});

const article = (valeurs) => ({ titre: "Foulées 2026", categorie: "album_photo", url: "foulees-2026", datePublication: "2026-09-27", description: "Photos", ...valeurs });
const photos = (...chemins) => chemins.map((chemin) => ({ chemin, legende: "" }));

const creer = async ({ valeurs, photosAlbum = photos("a.webp", "b.webp", "c.webp"), enBase = ["a.webp", "b.webp", "c.webp"] } = {}) => {
    const Images = faussesImages(enBase);
    const Articles = fauxArticles();
    const res = await appeler(creeAlbum, { body: { article: article(valeurs), photosAlbum }, Images, Articles });
    return { res, Images, Articles };
};

test("creeAlbum : une seule requête pour vérifier N photos", async () => {
    figerHorloge();
    const { res, Images, Articles } = await creer();
    assert.equal(res.corps.detail.article, true);
    assert.equal(Images.appelsFindAll.length, 1);
    assert.equal(Images.appelsFindOne, 0);
    assert.deepEqual(Images.appelsFindAll[0].where.nomFichier[Op.in], ["a.webp", "b.webp", "c.webp"]);
    assert.equal(Articles.crees.length, 1);
});

test("creeAlbum : photo manquante, même réponse d'erreur qu'avant", async () => {
    figerHorloge();
    const { res, Articles } = await creer({ enBase: ["a.webp", "c.webp"] });
    assert.deepEqual(res.corps, { etat: true, detail: { article: false, detail: "Photo introuvable : b.webp" } });
    assert.equal(Articles.crees.length, 0);
});

test("creeAlbum : album sans photo accepté sans requête", async () => {
    figerHorloge();
    const { res, Images } = await creer({ photosAlbum: [] });
    assert.equal(res.corps.detail.article, true);
    assert.equal(Images.appelsFindAll.length, 0);
});

test("creeAlbum : photos absentes (null ou non envoyées) traitées comme un album vide", async () => {
    figerHorloge();
    for (const photosAlbum of [null, undefined]) {
        const Images = faussesImages([]);
        const Articles = fauxArticles();
        const res = await appeler(creeAlbum, { body: { article: article(), photosAlbum }, Images, Articles });
        assert.deepEqual(res.corps, { etat: true, detail: { article: true, detail: "Album enregistré avec succès.", donnees: "/article/foulees-2026" } });
        assert.equal(Images.appelsFindAll.length, 0);
        assert.equal(Articles.crees[0].contenuHtml, "[]");
    }
});

test("creeAlbum : publication le jour même acceptée", async () => {
    figerHorloge();
    const { res } = await creer({ valeurs: { datePublication: "2026-09-27" } });
    assert.equal(res.corps.detail.article, true);
});

test("creeAlbum : publication la veille refusée", async () => {
    figerHorloge();
    const { res, Articles } = await creer({ valeurs: { datePublication: "2026-09-26" } });
    assert.deepEqual(res.corps, { etat: true, detail: { article: false, detail: "Date déjà passée." } });
    assert.equal(Articles.crees.length, 0);
});

test("creeAlbum : date mal formée refusée", async () => {
    figerHorloge();
    const { res } = await creer({ valeurs: { datePublication: "27/09/2026" } });
    assert.deepEqual(res.corps, { etat: true, detail: { article: false, detail: "Date invalide." } });
});

test("modifierAlbum : une seule requête et mise à jour du contenu", async () => {
    const album = instance({ url: "foulees-2026" });
    const Images = faussesImages(["a.webp", "b.webp"]);
    const images = photos("a.webp", "b.webp");
    const res = await appeler(modifierAlbum, { body: { url: "foulees-2026", images }, Images, Articles: fauxArticles(album) });
    assert.deepEqual(res.corps, { etat: true, detail: { album: true, detail: "Album mis à jour avec succès" } });
    assert.equal(Images.appelsFindAll.length, 1);
    assert.deepEqual(album.mises, [{ contenuHtml: JSON.stringify(images) }]);
});

test("modifierAlbum : photo manquante, même réponse d'erreur qu'avant", async () => {
    const album = instance({ url: "foulees-2026" });
    const Images = faussesImages(["a.webp"]);
    const res = await appeler(modifierAlbum, { body: { url: "foulees-2026", images: photos("a.webp", "z.webp") }, Images, Articles: fauxArticles(album) });
    assert.deepEqual(res.corps, { etat: true, detail: { album: false, detail: "Photo introuvable : z.webp" } });
    assert.deepEqual(album.mises, []);
});
test("creeAlbum : champ manquant ou catégorie autre qu'album refusé", async () => {
    figerHorloge();
    for (const valeurs of [{ titre: undefined }, { description: undefined }, { url: 3 }, { categorie: "course" }]) {
        const { res, Articles } = await creer({ valeurs });
        assert.deepEqual(res.corps, { etat: true, detail: { article: false, detail: "Merci de renseigner tous les champs obligatoires." } });
        assert.equal(Articles.crees.length, 0);
    }
});

test("creeAlbum : titre ou chemin déjà utilisé refusé", async () => {
    figerHorloge();
    const cas = [
        ["titre", "Un article a déjà ce titre."],
        ["url", "Un article a déjà ce chemin d'accès."],
    ];
    for (const [champ, detail] of cas) {
        const Articles = {
            crees: [],
            async findOne({ where }) {
                return where[champ] ? { id: 1 } : null;
            },
            async create(d) {
                this.crees.push(d);
            },
        };
        const res = await appeler(creeAlbum, { body: { article: article(), photosAlbum: photos("a.webp") }, Images: faussesImages(["a.webp"]), Articles });
        assert.deepEqual(res.corps, { etat: true, detail: { article: false, detail } });
        assert.equal(Articles.crees.length, 0);
    }
});

test("creeAlbum : photo de couverture introuvable refusée", async () => {
    figerHorloge();
    const { res, Articles } = await creer({ valeurs: { imageUrl: "absente.webp" } });
    assert.deepEqual(res.corps, { etat: true, detail: { article: false, detail: "Photo de couverture introuvable" } });
    assert.equal(Articles.crees.length, 0);
});

test("creeAlbum : album publié avec les photos en JSON", async () => {
    figerHorloge();
    const photosAlbum = photos("a.webp", "b.webp");
    const { res, Articles } = await creer({ valeurs: { imageUrl: "a.webp" }, photosAlbum });
    assert.deepEqual(res.corps, { etat: true, detail: { article: true, detail: "Album enregistré avec succès.", donnees: "/article/foulees-2026" } });
    assert.equal(Articles.crees[0].type, "publie");
    assert.equal(Articles.crees[0].contenuHtml, JSON.stringify(photosAlbum));
});

test("recupererAlbum : url manquante 400, album inconnu 404", async () => {
    assert.equal((await appeler(recupererAlbum, { query: {}, Articles: fauxArticles() })).statut, 400);
    const res = await appeler(recupererAlbum, { query: { url: "inconnu" }, Articles: fauxArticles() });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

test("recupererAlbum : contenu renvoyé", async () => {
    const res = await appeler(recupererAlbum, { query: { url: "foulees-2026" }, Articles: fauxArticles({ contenuHtml: "[]" }) });
    assert.deepEqual(res.corps, { etat: true, detail: { contenuHtml: "[]" } });
});

test("modifierAlbum : url manquante ou images mal formées, 400", async () => {
    const corpsInvalides = [{ images: [] }, { url: "foulees-2026", images: "a.webp" }, { url: "foulees-2026", images: [null] }, { url: "foulees-2026", images: [{ chemin: "a.webp" }] }, { url: "foulees-2026", images: [{ chemin: 1, legende: "" }] }];
    for (const body of corpsInvalides) {
        const res = await appeler(modifierAlbum, { body, Images: faussesImages([]), Articles: fauxArticles(instance({})) });
        assert.equal(res.statut, 400, JSON.stringify(body));
    }
});

test("modifierAlbum : album inconnu, 404", async () => {
    const res = await appeler(modifierAlbum, { body: { url: "inconnu", images: [] }, Images: faussesImages([]), Articles: fauxArticles(null) });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

test("creeAlbum : photosAlbum non tableau ou photo mal formée, 400 sans requête ni enregistrement", async () => {
    figerHorloge();
    for (const photosAlbum of ["a.webp", { chemin: "a.webp", legende: "" }, 3, ["a.webp"], [null], [{ chemin: "a.webp" }], [{ chemin: 1, legende: "" }]]) {
        const Images = faussesImages(["a.webp"]);
        const Articles = fauxArticles();
        const res = await appeler(creeAlbum, { body: { article: article(), photosAlbum }, Images, Articles });
        assert.equal(res.statut, 400, JSON.stringify(photosAlbum));
        assert.deepEqual(res.corps, { etat: false, detail: "Requête incorrecte" });
        assert.equal(Images.appelsFindAll.length, 0);
        assert.equal(Articles.crees.length, 0);
    }
});

test("creeAlbum : article absent ou non objet, 400 sans enregistrement", async () => {
    for (const body of [{ photosAlbum: photos("a.webp") }, { article: "texte", photosAlbum: [] }]) {
        const Articles = fauxArticles();
        const res = await appeler(creeAlbum, { body, Images: faussesImages(["a.webp"]), Articles });
        assert.equal(res.statut, 400);
        assert.deepEqual(res.corps, { etat: false, detail: "Requête incorrecte" });
        assert.equal(Articles.crees.length, 0);
    }
});
