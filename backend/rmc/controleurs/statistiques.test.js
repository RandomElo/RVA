import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import { fauxRes, intercepterMails } from "./testsUtilitaires.js";
import { enregistrementVue, mailRapport } from "./statistiques.js";

const mailsEnvoyes = intercepterMails();
const secretOriginal = process.env.INTERNAL_SECRET;

afterEach(() => {
    mailsEnvoyes.length = 0;
    mock.timers.reset();
    if (secretOriginal === undefined) delete process.env.INTERNAL_SECRET;
    else process.env.INTERNAL_SECRET = secretOriginal;
});

// mailRapport lit req.headers : en-têtes vides par défaut
const appeler = async (controleur, req) => {
    const res = fauxRes();
    await controleur({ ip: "127.0.0.1", headers: {}, ...req }, res, () => {});
    return res;
};

// Modèle Statistiques factice : findOrCreate trace les lignes, les agrégats renvoient des listes vides
const faussesStatistiques = ({ existante = false } = {}) => ({
    enregistrements: [],
    increments: 0,
    async findOrCreate(options) {
        this.enregistrements.push(options.where);
        const modele = this;
        return [
            {
                async increment() {
                    modele.increments++;
                },
            },
            !existante,
        ];
    },
    async sum() {
        return 0;
    },
    async findAll() {
        return [];
    },
});

const fauxUtilisateurs = (role) => ({
    appels: 0,
    async findByPk() {
        this.appels++;
        return role ? { role } : null;
    },
});

test("enregistrementVue : page manquante, 400", async () => {
    const res = await appeler(enregistrementVue, { body: {}, Statistiques: faussesStatistiques() });
    assert.equal(res.statut, 400);
});

test("enregistrementVue : administrateur jamais comptabilisé", async () => {
    const Statistiques = faussesStatistiques();
    const res = await appeler(enregistrementVue, { body: { page: "/" }, idUtilisateur: 1, Utilisateurs: fauxUtilisateurs("administrateur"), Statistiques });
    assert.equal(res.statut, 204);
    assert.equal(res.headersSent, true);
    assert.equal(Statistiques.enregistrements.length, 0);
});

test("enregistrementVue : adhérent comptabilisé comme adherent", async () => {
    const Statistiques = faussesStatistiques();
    const res = await appeler(enregistrementVue, { body: { page: "/courses" }, idUtilisateur: 2, Utilisateurs: fauxUtilisateurs("adherent"), Statistiques });
    assert.equal(res.statut, 204);
    assert.equal(Statistiques.enregistrements.length, 1);
    assert.equal(Statistiques.enregistrements[0].cible, "/courses");
    assert.equal(Statistiques.enregistrements[0].typePersonne, "adherent");
});

test("enregistrementVue : visiteur anonyme comptabilisé sans lecture d'utilisateur", async () => {
    const Statistiques = faussesStatistiques();
    const Utilisateurs = fauxUtilisateurs(null);
    const res = await appeler(enregistrementVue, { body: { page: "/" }, Utilisateurs, Statistiques });
    assert.equal(res.statut, 204);
    assert.equal(Utilisateurs.appels, 0);
    assert.equal(Statistiques.enregistrements[0].typePersonne, "visiteur");
});

test("enregistrementVue : ligne du jour existante, compteur incrémenté", async () => {
    const Statistiques = faussesStatistiques({ existante: true });
    await appeler(enregistrementVue, { body: { page: "/" }, Statistiques });
    assert.equal(Statistiques.increments, 1);
});

test("mailRapport : INTERNAL_SECRET non défini, 403 même avec un en-tête", async () => {
    delete process.env.INTERNAL_SECRET;
    const Statistiques = faussesStatistiques();
    const res = await appeler(mailRapport, { headers: { "x-internal-secret": "quelconque" }, Statistiques });
    assert.equal(res.statut, 403);
    assert.equal(mailsEnvoyes.length, 0);
});

test("mailRapport : en-tête absent, 403", async () => {
    process.env.INTERNAL_SECRET = "secret-de-test";
    const res = await appeler(mailRapport, { Statistiques: faussesStatistiques() });
    assert.equal(res.statut, 403);
    assert.equal(mailsEnvoyes.length, 0);
});

test("mailRapport : mauvais secret (même longueur ou non), 403", async () => {
    process.env.INTERNAL_SECRET = "secret-de-test";
    for (const essai of ["secret-de-tesT", "court", "secret-de-test-plus-long"]) {
        const res = await appeler(mailRapport, { headers: { "x-internal-secret": essai }, Statistiques: faussesStatistiques() });
        assert.equal(res.statut, 403, essai);
    }
    assert.equal(mailsEnvoyes.length, 0);
});

test("mailRapport : bon secret, rapport du mois écoulé envoyé", async () => {
    process.env.INTERNAL_SECRET = "secret-de-test";
    mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-27T08:00:00Z") });
    const res = await appeler(mailRapport, { headers: { "x-internal-secret": "secret-de-test" }, Statistiques: faussesStatistiques() });
    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps.periode, { debut: "2026-08-27", fin: "2026-09-27" });
    assert.equal(mailsEnvoyes.length, 1);
    assert.equal(mailsEnvoyes[0].template, "recapStatistiques");
});
