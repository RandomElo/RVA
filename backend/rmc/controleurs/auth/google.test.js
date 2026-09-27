import { test, before, after, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import { appeler, fauxUtilisateurs, instance } from "../testsUtilitaires.js";
import { connexionGoogle } from "./google.js";

afterEach(() => {
    mock.restoreAll();
});

// ---------- connexionGoogle ----------

const CLIENT_ID = "client-rva.apps.googleusercontent.com";
const infosJetonValides = { aud: CLIENT_ID, azp: CLIENT_ID, sub: "g1", expires_in: "3599" };

// Simule tokeninfo puis userinfo selon l'URL appelée
const reponseGoogle = (payload, ok = true, infosJeton = infosJetonValides, okTokeninfo = true) => async (url) =>
    String(url).includes("tokeninfo")
        ? { ok: okTokeninfo, json: async () => infosJeton }
        : { ok, json: async () => payload };

let clientIdOriginal;
before(() => {
    clientIdOriginal = process.env.GOOGLE_CLIENT_ID;
    process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
});
after(() => {
    if (clientIdOriginal === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = clientIdOriginal;
});

test("connexionGoogle : jeton absent (400) sans appel à Google", async () => {
    const fetchMock = mock.method(globalThis, "fetch", reponseGoogle({}));
    const res = await appeler(connexionGoogle, { body: {} });
    assert.equal(res.statut, 400);
    assert.equal(fetchMock.mock.callCount(), 0);
});

test("connexionGoogle : jeton refusé par Google (401)", async () => {
    mock.method(globalThis, "fetch", reponseGoogle({}, false));
    const res = await appeler(connexionGoogle, { body: { token: "t" } });
    assert.equal(res.statut, 401);
    assert.equal(res.corps.detail, "Jeton Google invalide ou expiré.");
});

test("connexionGoogle : erreur réseau vers Google (401)", async () => {
    mock.method(globalThis, "fetch", async () => { throw new Error("réseau"); });
    const res = await appeler(connexionGoogle, { body: { token: "t" } });
    assert.equal(res.statut, 401);
});

test("connexionGoogle : jeton émis pour une autre application (401)", async () => {
    const fetchMock = mock.method(globalThis, "fetch", reponseGoogle(
        { sub: "g1", email: "a@b.fr", email_verified: true },
        true,
        { ...infosJetonValides, aud: "autre-client", azp: "autre-client" }
    ));
    const Utilisateurs = fauxUtilisateurs(instance({ id: 1, role: "administrateur", googleId: "g1" }));
    const res = await appeler(connexionGoogle, { body: { token: "t" }, Utilisateurs });
    assert.equal(res.statut, 401);
    assert.equal(res.corps.detail, "Jeton Google invalide ou expiré.");
    assert.equal(fetchMock.mock.callCount(), 1);
    assert.equal(Utilisateurs.tokensGeneres.length, 0);
});

test("connexionGoogle : azp différent du client (401)", async () => {
    mock.method(globalThis, "fetch", reponseGoogle(
        { sub: "g1", email: "a@b.fr", email_verified: true },
        true,
        { ...infosJetonValides, azp: "autre-client" }
    ));
    const Utilisateurs = fauxUtilisateurs(instance({ id: 5, role: "adherent" }));
    const res = await appeler(connexionGoogle, { body: { token: "t" }, Utilisateurs });
    assert.equal(res.statut, 401);
    assert.equal(Utilisateurs.tokensGeneres.length, 0);
});

test("connexionGoogle : tokeninfo en erreur (401)", async () => {
    mock.method(globalThis, "fetch", reponseGoogle(
        { sub: "g1", email: "a@b.fr", email_verified: true },
        true,
        { error: "invalid_token" },
        false
    ));
    const Utilisateurs = fauxUtilisateurs(instance({ id: 5, role: "adherent" }));
    const res = await appeler(connexionGoogle, { body: { token: "t" }, Utilisateurs });
    assert.equal(res.statut, 401);
    assert.equal(Utilisateurs.tokensGeneres.length, 0);
});

test("connexionGoogle : jeton expiré selon tokeninfo (401)", async () => {
    mock.method(globalThis, "fetch", reponseGoogle(
        { sub: "g1", email: "a@b.fr", email_verified: true },
        true,
        { ...infosJetonValides, expires_in: "0" }
    ));
    const res = await appeler(connexionGoogle, { body: { token: "t" }, Utilisateurs: fauxUtilisateurs(instance({ id: 5, role: "adherent" })) });
    assert.equal(res.statut, 401);
});

test("connexionGoogle : sub incohérent entre tokeninfo et userinfo (401)", async () => {
    mock.method(globalThis, "fetch", reponseGoogle({ sub: "g-autre", email: "a@b.fr", email_verified: true }));
    const res = await appeler(connexionGoogle, { body: { token: "t" }, Utilisateurs: fauxUtilisateurs(instance({ id: 5, role: "adherent" })) });
    assert.equal(res.statut, 401);
});

test("connexionGoogle : GOOGLE_CLIENT_ID absent (401) sans appel à Google", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    try {
        const fetchMock = mock.method(globalThis, "fetch", reponseGoogle({ sub: "g1", email: "a@b.fr", email_verified: true }));
        const Utilisateurs = fauxUtilisateurs(instance({ id: 5, role: "adherent" }));
        const res = await appeler(connexionGoogle, { body: { token: "t" }, Utilisateurs });
        assert.equal(res.statut, 401);
        assert.equal(fetchMock.mock.callCount(), 0);
        assert.equal(Utilisateurs.tokensGeneres.length, 0);
    } finally {
        process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
    }
});

test("connexionGoogle : email Google non vérifié (401)", async () => {
    mock.method(globalThis, "fetch", reponseGoogle({ sub: "g1", email: "a@b.fr", email_verified: false }));
    const Utilisateurs = fauxUtilisateurs(instance({ id: 1, role: "adherent" }));
    const res = await appeler(connexionGoogle, { body: { token: "t" }, Utilisateurs });
    assert.equal(res.statut, 401);
    assert.equal(Utilisateurs.tokensGeneres.length, 0);
});

test("connexionGoogle : email absent de la base (403)", async () => {
    mock.method(globalThis, "fetch", reponseGoogle({ sub: "g1", email: "a@b.fr", email_verified: true }));
    const res = await appeler(connexionGoogle, { body: { token: "t" }, Utilisateurs: fauxUtilisateurs(null) });
    assert.equal(res.statut, 403);
});

test("connexionGoogle : administrateur lié à un autre compte Google (403)", async () => {
    mock.method(globalThis, "fetch", reponseGoogle(
        { sub: "g-autre", email: "a@b.fr", email_verified: true },
        true,
        { ...infosJetonValides, sub: "g-autre" }
    ));
    const utilisateur = instance({ id: 1, role: "administrateur", googleId: "g1" });
    const Utilisateurs = fauxUtilisateurs(utilisateur);
    const res = await appeler(connexionGoogle, { body: { token: "t" }, Utilisateurs });
    assert.equal(res.statut, 403);
    assert.equal(utilisateur.mises.length, 0);
    assert.equal(Utilisateurs.tokensGeneres.length, 0);
});

test("connexionGoogle : premier couplage d'un administrateur", async () => {
    mock.method(globalThis, "fetch", reponseGoogle({ sub: "g1", email: "a@b.fr", email_verified: true }));
    const utilisateur = instance({ id: 1, role: "administrateur", googleId: null });
    const Utilisateurs = fauxUtilisateurs(utilisateur);
    const res = await appeler(connexionGoogle, { body: { token: "t" }, Utilisateurs });
    assert.equal(res.corps.detail.token, true);
    assert.deepEqual(utilisateur.mises, [{ googleId: "g1" }]);
    assert.deepEqual(Utilisateurs.tokensGeneres, [1]);
});

test("connexionGoogle : adhérent connu connecté", async () => {
    const fetchMock = mock.method(globalThis, "fetch", reponseGoogle({ sub: "g1", email: "a@b.fr", email_verified: true }));
    const Utilisateurs = fauxUtilisateurs(instance({ id: 5, role: "adherent" }));
    const res = await appeler(connexionGoogle, { body: { token: "t&x" }, Utilisateurs });
    assert.equal(res.corps.detail.token, true);
    assert.deepEqual(Utilisateurs.tokensGeneres, [5]);
    const [urlTokeninfo, optionsTokeninfo] = fetchMock.mock.calls[0].arguments;
    assert.equal(urlTokeninfo, "https://oauth2.googleapis.com/tokeninfo");
    assert.equal(optionsTokeninfo.body, "access_token=t%26x");
});
