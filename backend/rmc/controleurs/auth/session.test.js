import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { fauxRes, fauxUtilisateurs } from "../testsUtilitaires.js";
import { ouvrirSession } from "./session.js";

const modeOriginal = process.env.MODE;
afterEach(() => {
    if (modeOriginal === undefined) delete process.env.MODE;
    else process.env.MODE = modeOriginal;
});

// Réponse factice qui mémorise les cookies posés
function resAvecCookies() {
    const res = fauxRes();
    res.cookies = [];
    res.cookie = function (nom, valeur, options) { this.cookies.push({ nom, valeur, options }); return this; };
    return res;
}

const objetRetour = { etat: true, detail: { token: true, detail: "Vous êtes correctement authentifié." } };

test("ouvrirSession : pose le cookie de session et renvoie l'objet de retour", async () => {
    process.env.MODE = "developpement";
    const Utilisateurs = fauxUtilisateurs(null);
    const res = resAvecCookies();
    await ouvrirSession({ Utilisateurs }, res, { id: 7 }, objetRetour);
    assert.deepEqual(Utilisateurs.tokensGeneres, [7]);
    assert.deepEqual(res.cookies, [{
        nom: "utilisateur",
        valeur: "jeton-factice",
        options: { maxAge: 3 * 24 * 60 * 60 * 1000, httpOnly: true, sameSite: "Strict", secure: false },
    }]);
    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps, objetRetour);
});

test("ouvrirSession : cookie secure en production", async () => {
    process.env.MODE = "production";
    const res = resAvecCookies();
    await ouvrirSession({ Utilisateurs: fauxUtilisateurs(null) }, res, { id: 7 }, objetRetour);
    assert.equal(res.cookies[0].options.secure, true);
});

test("ouvrirSession : échec de génération, aucun cookie et réponse d'erreur", async () => {
    const Utilisateurs = { async genererTokenSession() { throw new Error("JWT_SECRET non défini"); } };
    const res = resAvecCookies();
    await ouvrirSession({ Utilisateurs }, res, { id: 7 }, objetRetour);
    assert.equal(res.cookies.length, 0);
    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps, { etat: false, detail: "Erreur lors de la génération du cookie d'authentification" });
});
