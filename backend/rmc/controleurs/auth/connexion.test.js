import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";

import { appeler, fauxUtilisateurs, instance, intercepterMails } from "../testsUtilitaires.js";
import { verificationCode, verifierMotDePasse } from "./connexion.js";

const mailsEnvoyes = intercepterMails();
afterEach(() => {
    mailsEnvoyes.length = 0;
    mock.restoreAll();
});

// ---------- verifierMotDePasse ----------

test("verifierMotDePasse : champs manquants (400)", async () => {
    const res = await appeler(verifierMotDePasse, { body: { mail: "a@b.fr" }, Utilisateurs: fauxUtilisateurs(null) });
    assert.equal(res.statut, 400);
    assert.equal(res.corps.etat, false);
});

test("verifierMotDePasse : utilisateur inconnu (400)", async () => {
    const res = await appeler(verifierMotDePasse, { body: { mail: "a@b.fr", mdp: "x" }, Utilisateurs: fauxUtilisateurs(null) });
    assert.equal(res.statut, 400);
});

test("verifierMotDePasse : utilisateur non administrateur (403)", async () => {
    const res = await appeler(verifierMotDePasse, { body: { mail: "a@b.fr", mdp: "x" }, Utilisateurs: fauxUtilisateurs({ id: 1, role: "adherent", motDePasse: null }) });
    assert.equal(res.statut, 403);
    assert.equal(res.corps.detail, "Accès interdit.");
});

test("verifierMotDePasse : mot de passe incorrect (403) sans mail envoyé", async () => {
    const motDePasse = await bcrypt.hash("bon-mot-de-passe", 4);
    const Tokens = { crees: [], async create(t) { this.crees.push(t); } };
    const res = await appeler(verifierMotDePasse, {
        body: { mail: "a@b.fr", mdp: "mauvais" },
        Utilisateurs: fauxUtilisateurs({ id: 1, role: "administrateur", motDePasse }),
        Tokens,
    });
    assert.equal(res.statut, 403);
    assert.equal(res.corps.detail, "Mot de passe incorrect");
    assert.equal(Tokens.crees.length, 0);
    assert.equal(mailsEnvoyes.length, 0);
});

test("verifierMotDePasse : mot de passe correct, lien de connexion envoyé", async () => {
    const motDePasse = await bcrypt.hash("bon-mot-de-passe", 4);
    const Tokens = { crees: [], async create(t) { this.crees.push(t); } };
    const res = await appeler(verifierMotDePasse, {
        body: { mail: "a@b.fr", mdp: "bon-mot-de-passe" },
        Utilisateurs: fauxUtilisateurs({ id: 1, role: "administrateur", motDePasse, mail: "a@b.fr", prenom: "Admin" }),
        Tokens,
    });
    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps, { etat: true, detail: { compte: true, detail: "Mail envoyer" } });
    assert.equal(Tokens.crees.length, 1);
    assert.equal(Tokens.crees[0].type, "lienConnexion");
    assert.equal(mailsEnvoyes.length, 1);
    assert.equal(mailsEnvoyes[0].to, "a@b.fr");
});

// ---------- verificationCode ----------

const fauxTokens = (token) => ({ async findOne() { return token; } });
const tokenValide = (details = {}) => instance({
    type: "codeConnexion",
    details: { idUtilisateur: 1 },
    dateExpiration: new Date(Date.now() + 60_000),
    ...details,
});

test("verificationCode : champs manquants (400)", async () => {
    const res = await appeler(verificationCode, { body: { mail: "a@b.fr" } });
    assert.equal(res.statut, 400);
});

test("verificationCode : utilisateur déjà authentifié (400)", async () => {
    const res = await appeler(verificationCode, { body: { mail: "a@b.fr", code: "c" }, idUtilisateur: 3 });
    assert.equal(res.statut, 400);
    assert.equal(res.corps.detail.token, true);
});

test("verificationCode : utilisateur inexistant (404)", async () => {
    const res = await appeler(verificationCode, { body: { mail: "a@b.fr", code: "c" }, Utilisateurs: fauxUtilisateurs(null) });
    assert.equal(res.statut, 404);
});

test("verificationCode : code inconnu refusé", async () => {
    const Utilisateurs = fauxUtilisateurs(instance({ id: 1 }));
    const res = await appeler(verificationCode, { body: { mail: "a@b.fr", code: "c" }, Utilisateurs, Tokens: fauxTokens(null) });
    assert.deepEqual(res.corps, { etat: true, detail: { token: false, detail: "Code ou accès invalide." } });
    assert.equal(Utilisateurs.tokensGeneres.length, 0);
});

test("verificationCode : code d'un autre utilisateur refusé et conservé", async () => {
    const Utilisateurs = fauxUtilisateurs(instance({ id: 1 }));
    const token = tokenValide({ details: { idUtilisateur: 2 } });
    const res = await appeler(verificationCode, { body: { mail: "a@b.fr", code: "c" }, Utilisateurs, Tokens: fauxTokens(token) });
    assert.equal(res.corps.detail.token, false);
    assert.equal(res.corps.detail.detail, "Code ou accès invalide.");
    assert.equal(token.detruit, false);
    assert.equal(Utilisateurs.tokensGeneres.length, 0);
});

test("verificationCode : un token d'un autre type que codeConnexion est refusé", async () => {
    const Utilisateurs = fauxUtilisateurs(instance({ id: 1 }));
    const token = tokenValide({ type: "lienConnexion" });
    const res = await appeler(verificationCode, { body: { mail: "a@b.fr", code: "c" }, Utilisateurs, Tokens: fauxTokens(token) });
    assert.deepEqual(res.corps, { etat: true, detail: { token: false, detail: "Type de token incorrect." } });
    assert.equal(token.detruit, false);
    assert.equal(Utilisateurs.tokensGeneres.length, 0);
});

test("verificationCode : code expiré refusé", async () => {
    const Utilisateurs = fauxUtilisateurs(instance({ id: 1 }));
    const token = tokenValide({ dateExpiration: new Date(Date.now() - 60_000) });
    const res = await appeler(verificationCode, { body: { mail: "a@b.fr", code: "c" }, Utilisateurs, Tokens: fauxTokens(token) });
    assert.deepEqual(res.corps, { etat: true, detail: { token: false, detail: "Le code/lien a expiré." } });
    assert.equal(token.detruit, false);
    assert.equal(Utilisateurs.tokensGeneres.length, 0);
});

test("verificationCode : code valide, token détruit et session créée", async () => {
    const utilisateur = instance({ id: 1 });
    const Utilisateurs = fauxUtilisateurs(utilisateur);
    const token = tokenValide();
    const res = await appeler(verificationCode, { body: { mail: "a@b.fr", code: "c" }, Utilisateurs, Tokens: fauxTokens(token) });
    assert.equal(res.corps.detail.token, true);
    assert.equal(token.detruit, true);
    assert.equal(utilisateur.mises.length, 1);
    assert.deepEqual(Utilisateurs.tokensGeneres, [1]);
});
