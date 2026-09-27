import { test } from "node:test";
import assert from "node:assert/strict";

import { appeler } from "../testsUtilitaires.js";
import { enregistrerPhotoControleur, photo } from "./photos.js";

test("enregistrerPhotoControleur : adhérent inexistant, 404", async () => {
    const Utilisateurs = { async findByPk() { return null; } };
    const res = await appeler(enregistrerPhotoControleur, { file: { buffer: Buffer.from("") }, params: { id: "999" }, Utilisateurs });
    assert.equal(res.statut, 404);
    assert.deepEqual(res.corps, { etat: false, detail: "Ressource introuvable" });
});

// Ce message déclenche la déconnexion automatique côté frontend (useRequete)
test("photo : visiteur non connecté, 403 « Vous n'êtes pas connecté »", async () => {
    const res = await appeler(photo, { params: { nomFichier: "photo.webp" } });
    assert.equal(res.statut, 403);
    assert.deepEqual(res.corps, { etat: false, detail: "Vous n'êtes pas connecté" });
});

test("enregistrerPhotoControleur : aucun fichier, 400 au format { etat, detail }", async () => {
    const res = await appeler(enregistrerPhotoControleur, { params: { id: "1" }, Utilisateurs: {} });
    assert.equal(res.statut, 400);
    assert.deepEqual(res.corps, { etat: false, detail: "Aucun fichier reçu" });
});
