import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

import { verificationCookie } from "./verificationCookie.js";

const SECRET = "secret-de-test";

beforeEach(() => {
    process.env.CHAINE_JWT_COOKIE = SECRET;
});

// Exécute le middleware et attend soit next(), soit une réponse json (jwt.verify est asynchrone)
function executer(req) {
    return new Promise((resolve) => {
        const res = {
            cookiesEffaces: [],
            clearCookie(nom) { this.cookiesEffaces.push(nom); return this; },
            json(corps) { resolve({ suivant: false, res, corps }); return this; },
        };
        verificationCookie(req, res, () => resolve({ suivant: true, res }));
    });
}

const modeleUtilisateurs = (utilisateur) => ({
    appels: [],
    async findByPk(id) { this.appels.push(id); return utilisateur; },
});

test("sans cookie : next() sans aucune vérification", async () => {
    const Utilisateurs = modeleUtilisateurs({ id: 1 });
    const req = { cookies: {}, Utilisateurs };
    const { suivant, res } = await executer(req);
    assert.equal(suivant, true);
    assert.equal(req.idUtilisateur, undefined);
    assert.deepEqual(Utilisateurs.appels, []);
    assert.deepEqual(res.cookiesEffaces, []);
});

test("token invalide : cookie effacé et pas d'idUtilisateur", async () => {
    const Utilisateurs = modeleUtilisateurs({ id: 1 });
    const req = { cookies: { utilisateur: jwt.sign({ id: 1 }, "autre-secret") }, Utilisateurs };
    const { suivant, res, corps } = await executer(req);
    assert.equal(suivant, false);
    assert.deepEqual(res.cookiesEffaces, ["utilisateur"]);
    assert.deepEqual(corps, { etat: true, detail: "accueil" });
    assert.equal(req.idUtilisateur, undefined);
    assert.deepEqual(Utilisateurs.appels, []);
});

test("token expiré : cookie effacé et pas d'idUtilisateur", async () => {
    const req = { cookies: { utilisateur: jwt.sign({ id: 1, exp: Math.floor(Date.now() / 1000) - 60 }, SECRET) }, Utilisateurs: modeleUtilisateurs({ id: 1 }) };
    const { suivant, res } = await executer(req);
    assert.equal(suivant, false);
    assert.deepEqual(res.cookiesEffaces, ["utilisateur"]);
    assert.equal(req.idUtilisateur, undefined);
});

test("utilisateur supprimé : cookie effacé et pas d'idUtilisateur", async () => {
    const Utilisateurs = modeleUtilisateurs(null);
    const req = { cookies: { utilisateur: jwt.sign({ id: 42 }, SECRET) }, Utilisateurs };
    const { suivant, res, corps } = await executer(req);
    assert.equal(suivant, false);
    assert.deepEqual(Utilisateurs.appels, [42]);
    assert.deepEqual(res.cookiesEffaces, ["utilisateur"]);
    assert.deepEqual(corps, { etat: true, detail: "accueil" });
    assert.equal(req.idUtilisateur, undefined);
});

test("token valide : idUtilisateur renseigné et next()", async () => {
    const req = { cookies: { utilisateur: jwt.sign({ id: 7 }, SECRET) }, Utilisateurs: modeleUtilisateurs({ id: 7 }) };
    const { suivant, res } = await executer(req);
    assert.equal(suivant, true);
    assert.equal(req.idUtilisateur, 7);
    assert.deepEqual(res.cookiesEffaces, []);
});
