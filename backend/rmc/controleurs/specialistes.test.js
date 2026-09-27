import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { appeler, intercepterMails } from "./testsUtilitaires.js";
import { cree, modifierSpecialiste, suggestion, supprimer } from "./specialistes.js";

const mailsEnvoyes = intercepterMails();
afterEach(() => { mailsEnvoyes.length = 0; });

test("supprimer : spécialiste inexistant, 404", async () => {
    const Specialistes = { async findOne() { return null; }, async destroy() { throw new Error("ne doit pas être appelé"); } };
    const res = await appeler(supprimer, { body: { nom: "Inconnu" }, Specialistes });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

const fauxSpecialistes = () => ({
    crees: [],
    misesAJour: [],
    detruits: [],
    optionsFindAll: [],
    async create(donnees) {
        this.crees.push(donnees);
    },
    async update(donnees, options) {
        this.misesAJour.push({ donnees, options });
        return [1];
    },
    async findAll(options) {
        this.optionsFindAll.push(options);
        return [];
    },
    async findOne() {
        return { nom: "Dr Test" };
    },
    async destroy(options) {
        this.detruits.push(options);
    },
});

const corpsSpecialiste = (valeurs) => ({ nom: "Dr Test", specialite: "kine_sport", detail: "Kiné du sport", adresse: "Vincennes", ...valeurs });

test("cree : spécialité non autorisée refusée", async () => {
    const Specialistes = fauxSpecialistes();
    const res = await appeler(cree, { body: corpsSpecialiste({ specialite: "chirurgien" }), Specialistes });
    assert.deepEqual(res.corps, { etat: true, detail: { specialiste: false, detail: "Spécialité invalide." } });
    assert.equal(Specialistes.crees.length, 0);
});

test("cree : téléphone invalide refusé, formats français acceptés", async () => {
    const refuse = await appeler(cree, { body: corpsSpecialiste({ telephone: "12345" }), Specialistes: fauxSpecialistes() });
    assert.deepEqual(refuse.corps, { etat: true, detail: { specialiste: false, detail: "Numéro de téléphone invalide." } });
    for (const telephone of ["0612345678", "06 12 34 56 78", "06.12.34.56.78", "+33 612345678"]) {
        const res = await appeler(cree, { body: corpsSpecialiste({ telephone }), Specialistes: fauxSpecialistes() });
        assert.equal(res.corps.detail.specialiste, true, telephone);
    }
});

test("cree : lien de réservation non http(s) refusé", async () => {
    const res = await appeler(cree, { body: corpsSpecialiste({ lienReservation: "javascript:alert(1)" }), Specialistes: fauxSpecialistes() });
    assert.deepEqual(res.corps, { etat: true, detail: { specialiste: false, detail: "Le lien de réservation est invalide." } });
});

test("cree : succès, spécialiste validé et facultatifs à null", async () => {
    const Specialistes = fauxSpecialistes();
    const res = await appeler(cree, { body: corpsSpecialiste({ telephone: "", lienReservation: "" }), Specialistes });
    assert.equal(res.corps.detail.notification, "Spécialiste créé avec succès !");
    assert.deepEqual(Specialistes.crees[0], { etat: "valider", nom: "Dr Test", specialite: "kine_sport", detail: "Kiné du sport", adresse: "Vincennes", telephone: null, lienReservation: null });
    assert.deepEqual(Specialistes.optionsFindAll[0].where, { etat: "valider" });
});

test("modifierSpecialiste : mise à jour par nom, liste admin renvoyée", async () => {
    const Specialistes = fauxSpecialistes();
    const res = await appeler(modifierSpecialiste, { body: corpsSpecialiste(), Specialistes });
    assert.equal(res.corps.detail.notification, "Spécialiste modifié avec succès !");
    assert.equal(Specialistes.crees.length, 0);
    assert.deepEqual(Specialistes.misesAJour[0].options, { where: { nom: "Dr Test" } });
    assert.equal(Specialistes.optionsFindAll[0].where, undefined);
    assert.ok(Specialistes.optionsFindAll[0].attributes.includes("etat"));
});

test("suggestion : enregistrée en suggestion et notifiée par mail", async () => {
    const Specialistes = fauxSpecialistes();
    const Utilisateurs = {
        async findByPk() {
            return { prenom: "Eloi", nom: "Test" };
        },
    };
    const res = await appeler(suggestion, { body: corpsSpecialiste(), Specialistes, Utilisateurs, idUtilisateur: 3 });
    assert.equal(res.corps.detail.notification, "Votre suggestion a bien été envoyée.");
    assert.equal(Specialistes.crees[0].etat, "suggestion");
    assert.equal(mailsEnvoyes.length, 1);
    assert.equal(mailsEnvoyes[0].template, "suggestionSpecialiste");
});

test("suggestion : compte supprimé depuis la connexion, 403 avant tout enregistrement", async () => {
    const Specialistes = fauxSpecialistes();
    const Utilisateurs = { async findByPk() { return null; } };
    const res = await appeler(suggestion, { body: corpsSpecialiste(), Specialistes, Utilisateurs, idUtilisateur: 3 });
    assert.equal(res.statut, 403);
    assert.deepEqual(res.corps, { etat: false, detail: "Vous n'êtes pas connecté" });
    assert.equal(Specialistes.crees.length, 0);
    assert.equal(mailsEnvoyes.length, 0);
});

test("suggestion : données invalides, ni enregistrement ni mail", async () => {
    const Specialistes = fauxSpecialistes();
    const res = await appeler(suggestion, { body: corpsSpecialiste({ specialite: "autre" }), Specialistes, Utilisateurs: {}, idUtilisateur: 3 });
    assert.equal(res.corps.detail.specialiste, false);
    assert.equal(Specialistes.crees.length, 0);
    assert.equal(mailsEnvoyes.length, 0);
});

test("supprimer : succès, liste admin renvoyée", async () => {
    const Specialistes = fauxSpecialistes();
    const res = await appeler(supprimer, { body: { nom: "Dr Test" }, Specialistes });
    assert.deepEqual(res.corps, { etat: true, detail: [] });
    assert.deepEqual(Specialistes.detruits, [{ where: { nom: "Dr Test" } }]);
});

test("modifierSpecialiste : aucun spécialiste de ce nom, 404 sans message de succès", async () => {
    const Specialistes = {
        ...fauxSpecialistes(),
        async update() {
            return [0];
        },
    };
    const res = await appeler(modifierSpecialiste, { body: corpsSpecialiste({ nom: "Inconnu" }), Specialistes });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
    assert.equal(Specialistes.optionsFindAll.length, 0);
});

test("suggestion : compte supprimé entre-temps, 403 sans mail", async () => {
    const Utilisateurs = { async findByPk() { return null; } };
    const res = await appeler(suggestion, { body: corpsSpecialiste(), Specialistes: fauxSpecialistes(), Utilisateurs, idUtilisateur: 3 });
    assert.equal(res.statut, 403);
    assert.deepEqual(res.corps, { etat: false, detail: "Vous n'êtes pas connecté" });
    assert.equal(mailsEnvoyes.length, 0);
});
