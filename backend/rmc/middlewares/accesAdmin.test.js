import { test } from "node:test";
import assert from "node:assert/strict";

import { accesAdmin } from "./accesAdmin.js";

function fauxRes() {
    return {
        statut: 200,
        corps: undefined,
        status(code) { this.statut = code; return this; },
        json(corps) { this.corps = corps; return this; },
    };
}

async function executer(idUtilisateur, utilisateur) {
    const req = { idUtilisateur, Utilisateurs: { findByPk: async () => utilisateur } };
    const res = fauxRes();
    let suivant = false;
    await accesAdmin(req, res, () => { suivant = true; });
    return { res, suivant };
}

test("accesAdmin refuse une requête non connectée (403)", async () => {
    const { res, suivant } = await executer(undefined, { id: 1, role: "administrateur" });
    assert.equal(suivant, false);
    assert.equal(res.statut, 403);
    assert.equal(res.corps.etat, false);
});

test("accesAdmin refuse un utilisateur introuvable (403)", async () => {
    const { res, suivant } = await executer(1, null);
    assert.equal(suivant, false);
    assert.equal(res.statut, 403);
});

test("accesAdmin refuse un adhérent (403)", async () => {
    const { res, suivant } = await executer(1, { id: 1, role: "adherent" });
    assert.equal(suivant, false);
    assert.equal(res.statut, 403);
});

test("accesAdmin laisse passer un administrateur", async () => {
    const { res, suivant } = await executer(1, { id: 1, role: "administrateur" });
    assert.equal(suivant, true);
    assert.equal(res.corps, undefined);
});
