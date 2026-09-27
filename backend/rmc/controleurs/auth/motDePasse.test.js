import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";

import { appeler, instance } from "../testsUtilitaires.js";
import { changementMdp } from "./motDePasse.js";

const nouveauMdp = "Nouveau-mot-de-passe-1";

test("changementMdp : champs manquants, 400", async () => {
    const res = await appeler(changementMdp, { body: { ancienMdp: "x" } });
    assert.equal(res.statut, 400);
});

test("changementMdp : compte supprimé avec un cookie encore valide, 403", async () => {
    const Utilisateurs = { async findByPk() { return null; } };
    const res = await appeler(changementMdp, { body: { ancienMdp: "ancien", nouveauMdp }, Utilisateurs, idUtilisateur: 1 });
    assert.equal(res.statut, 403);
    assert.deepEqual(res.corps, { etat: false, detail: "Vous n'êtes pas connecté" });
});

test("changementMdp : ancien mot de passe incorrect, aucune mise à jour", async () => {
    const utilisateur = instance({ motDePasse: await bcrypt.hash("bon-ancien", 4) });
    const Utilisateurs = { async findByPk() { return utilisateur; } };
    const res = await appeler(changementMdp, { body: { ancienMdp: "mauvais", nouveauMdp }, Utilisateurs, idUtilisateur: 1 });
    assert.deepEqual(res.corps, { etat: true, detail: { changer: false, detail: "Mot de passe incorrect" } });
    assert.deepEqual(utilisateur.mises, []);
});
