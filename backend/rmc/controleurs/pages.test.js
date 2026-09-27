import { test } from "node:test";
import assert from "node:assert/strict";

import { appeler } from "./testsUtilitaires.js";
import { detailsPage, detailsPageAdmin, modification, supprimer } from "./pages.js";

const Pages = {
    async findOne() { return null; },
    async update() { throw new Error("ne doit pas être appelé"); },
};

test("modification : page à modifier inexistante, 404", async () => {
    const body = { contenuHtml: "<p>Texte</p>", dansNavigation: false, titre: "Titre", url: "titre", ancienneUrl: "inconnue" };
    const res = await appeler(modification, { body, Pages });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

test("supprimer : page inexistante, 404", async () => {
    const res = await appeler(supprimer, { body: { nom: "Inconnue" }, Pages });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

test("detailsPageAdmin : page inexistante, 404", async () => {
    const res = await appeler(detailsPageAdmin, { params: { url: "inconnue" }, Pages });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

// Page publique : PageBdd.tsx affiche sa propre page 404 à partir de ce corps
test("detailsPage : page inexistante, réponse métier inchangée", async () => {
    const res = await appeler(detailsPage, { query: { url: "inconnue" }, Pages });
    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps, { etat: true, detail: { page: false, detail: 404 } });
});

test("detailsPage et detailsPageAdmin : url manquante, 400 au format { etat, detail }", async () => {
    for (const [controleur, req] of [[detailsPage, { query: {} }], [detailsPageAdmin, { params: {} }]]) {
        const res = await appeler(controleur, { ...req, Pages });
        assert.equal(res.statut, 400);
        assert.deepEqual(res.corps, { etat: false, detail: "Requête incorrecte." });
    }
});
