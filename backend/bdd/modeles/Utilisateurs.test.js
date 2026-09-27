import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import definirUtilisateurs from "./Utilisateurs.js";

const secretOriginal = process.env.CHAINE_JWT_COOKIE;
afterEach(() => {
    if (secretOriginal === undefined) delete process.env.CHAINE_JWT_COOKIE;
    else process.env.CHAINE_JWT_COOKIE = secretOriginal;
});

// bdd factice : define renvoie un modèle dont update est espionné
function modeleFactice() {
    const mises = [];
    const bdd = { define: () => ({ async update(valeurs, options) { mises.push({ valeurs, options }); } }) };
    return { Utilisateurs: definirUtilisateurs(bdd), mises };
}

test("genererTokenSession : met à jour derniereConnexion et signe un JWT de 3 jours", async () => {
    process.env.CHAINE_JWT_COOKIE = "secret-de-test";
    const { Utilisateurs, mises } = modeleFactice();
    const jeton = await Utilisateurs.genererTokenSession({ id: 4 });
    assert.equal(mises.length, 1);
    assert.ok(mises[0].valeurs.derniereConnexion instanceof Date);
    assert.deepEqual(mises[0].options, { where: { id: 4 } });
    const charge = jwt.verify(jeton, "secret-de-test");
    assert.equal(charge.id, 4);
    assert.equal(charge.exp - charge.iat, 3 * 24 * 60 * 60);
});

test("genererTokenSession : secret absent, rejet sans mise à jour", async () => {
    delete process.env.CHAINE_JWT_COOKIE;
    const { Utilisateurs, mises } = modeleFactice();
    await assert.rejects(Utilisateurs.genererTokenSession({ id: 4 }), /JWT_SECRET non défini/);
    assert.equal(mises.length, 0);
});
