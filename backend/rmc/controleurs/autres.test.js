import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import { appeler, instance, intercepterMails } from "./testsUtilitaires.js";
import { detailsInterfaceAdministration, envoyerMailContact, gestionToken, verifierCaptcha } from "./autres.js";
import { logger } from "../../fonctions/utilitaires/logger.js";

const fauxTokens = (token) => ({ async findOne() { return token; } });
const dansUneHeure = () => new Date(Date.now() + 60 * 60 * 1000);

test("gestionToken : token de type codeConnexion (400) sans le consommer", async () => {
    const token = instance({ token: "123456789", type: "codeConnexion", details: { idUtilisateur: 1 }, dateExpiration: dansUneHeure() });
    const res = await appeler(gestionToken, { body: { token: "123456789" }, Tokens: fauxTokens(token) });
    assert.equal(res.statut, 400);
    assert.deepEqual(res.corps, { etat: false, detail: "Type de lien non pris en charge." });
    assert.equal(token.detruit, false);
});

test("gestionToken : token inexistant, réponse envoyée", async () => {
    const res = await appeler(gestionToken, { body: { token: "inconnu" }, Tokens: fauxTokens(null) });
    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps, { etat: true, detail: { token: false, detail: "Le lien est obsolète ou inexistant." } });
});
const mailsEnvoyes = intercepterMails();
const fetchOriginal = globalThis.fetch;
afterEach(() => {
    mailsEnvoyes.length = 0;
    globalThis.fetch = fetchOriginal;
    mock.restoreAll();
});

// gestionToken

test("gestionToken : token expiré refusé", async () => {
    const token = instance({ token: "abc", type: "lienConnexion", details: { idUtilisateur: 1 }, dateExpiration: new Date(Date.now() - 1000) });
    const res = await appeler(gestionToken, { body: { token: "abc" }, Tokens: fauxTokens(token) });
    assert.deepEqual(res.corps, { etat: true, detail: { token: false, detail: "Le lien n'est plus valide" } });
    assert.equal(token.detruit, false);
});

const tokensAvecCreation = (token) => ({
    crees: [],
    async findOne() {
        return token;
    },
    async create(donnees) {
        this.crees.push(donnees);
    },
});

test("gestionToken : lien de connexion alors que déjà connecté, refusé sans consommer", async () => {
    const token = instance({ token: "abc", type: "lienConnexion", details: { idUtilisateur: 1 }, dateExpiration: dansUneHeure() });
    const res = await appeler(gestionToken, { body: { token: "abc" }, Tokens: tokensAvecCreation(token), idUtilisateur: 2 });
    assert.equal(res.corps.detail.token, false);
    assert.equal(token.detruit, false);
});

test("gestionToken : lien de connexion pour un compte supprimé", async () => {
    const token = instance({ token: "abc", type: "lienConnexion", details: { idUtilisateur: 1 }, dateExpiration: dansUneHeure() });
    const Utilisateurs = {
        async findByPk() {
            return null;
        },
    };
    const res = await appeler(gestionToken, { body: { token: "abc" }, Tokens: tokensAvecCreation(token), Utilisateurs });
    assert.deepEqual(res.corps, { etat: true, detail: { token: false, detail: "Compte inexistant." } });
});

test("gestionToken : lien de connexion échangé contre un code à 9 chiffres valable 15 min", async () => {
    const token = instance({ token: "abc", type: "lienConnexion", details: { idUtilisateur: 1 }, dateExpiration: dansUneHeure() });
    const Tokens = tokensAvecCreation(token);
    const Utilisateurs = {
        async findByPk() {
            return { id: 1 };
        },
    };
    const avant = Date.now();
    const res = await appeler(gestionToken, { body: { token: "abc" }, Tokens, Utilisateurs });
    const code = res.corps.detail.detail.aAfficher;
    assert.equal(res.corps.detail.token, true);
    assert.match(String(code), /^\d{9}$/);
    assert.equal(Tokens.crees.length, 1);
    assert.equal(Tokens.crees[0].token, code);
    assert.equal(Tokens.crees[0].type, "codeConnexion");
    assert.deepEqual(Tokens.crees[0].details, { idUtilisateur: 1 });
    const duree = Tokens.crees[0].dateExpiration.getTime() - avant;
    assert.ok(duree > 14 * 60 * 1000 && duree <= 15 * 60 * 1000 + 1000);
    assert.equal(token.detruit, true);
});

test("gestionToken : lien de désinscription newsletter", async () => {
    const token = instance({ token: "abc", type: "lienDesinscriptionNewsletter", details: { idUtilisateur: 1 } });
    const utilisateur = instance({ id: 1, recevoirNewsletter: true });
    const res = await appeler(gestionToken, {
        body: { token: "abc" },
        Tokens: fauxTokens(token),
        Utilisateurs: {
            async findByPk() {
                return utilisateur;
            },
        },
    });
    assert.deepEqual(res.corps, { etat: true, detail: { token: true, detail: "Vous êtes désinscrit de la newsletter." } });
    assert.deepEqual(utilisateur.mises, [{ recevoirNewsletter: false }]);
});

test("gestionToken : désinscription d'un compte supprimé", async () => {
    const token = instance({ token: "abc", type: "lienDesinscriptionNewsletter", details: { idUtilisateur: 1 } });
    const res = await appeler(gestionToken, {
        body: { token: "abc" },
        Tokens: fauxTokens(token),
        Utilisateurs: {
            async findByPk() {
                return null;
            },
        },
    });
    assert.deepEqual(res.corps, { etat: true, detail: { token: false, detail: "Compte inexistant." } });
});

// envoyerMailContact

const contact = (valeurs) => ({ nom: "Jean Dupont", mail: "jean@exemple.fr", message: "Bonjour, une question.", ...valeurs });

// Champ absent ou vide : refusé par validerCorps dans le routeur (routeurs/validationCorps.test.js)
test("envoyerMailContact : champ non textuel ou trop long, 400 sans mail", async () => {
    for (const body of [contact({ mail: undefined }), contact({ message: ["tableau"] }), contact({ message: "x".repeat(5001) })]) {
        const res = await appeler(envoyerMailContact, { body });
        assert.equal(res.statut, 400);
    }
    assert.equal(mailsEnvoyes.length, 0);
});

test("envoyerMailContact : nom, mail ou message invalide refusé", async () => {
    const cas = [
        [contact({ nom: "Jean<script>" }), "Nom invalide"],
        [contact({ mail: "pas-un-mail" }), "Mail invalide"],
        [contact({ message: "   ok  " }), "Message invalide (trop long ou trop court)"],
        [contact({ message: "x".repeat(3001) }), "Message invalide (trop long ou trop court)"],
    ];
    for (const [body, detail] of cas) {
        const res = await appeler(envoyerMailContact, { body });
        assert.deepEqual(res.corps, { etat: true, detail: { message: false, detail } });
    }
    assert.equal(mailsEnvoyes.length, 0);
});

test("envoyerMailContact : message valide envoyé avec réponse à l'expéditeur", async () => {
    const res = await appeler(envoyerMailContact, { body: contact() });
    assert.deepEqual(res.corps, { etat: true, detail: { message: true } });
    assert.equal(mailsEnvoyes.length, 1);
    assert.equal(mailsEnvoyes[0].template, "contact");
    assert.equal(mailsEnvoyes[0].replyTo, "jean@exemple.fr");
});

// detailsInterfaceAdministration

test("detailsInterfaceAdministration : agrège les compteurs", async () => {
    let compteur = 0;
    const count = async () => ++compteur;
    const res = await appeler(detailsInterfaceAdministration, {
        Utilisateurs: { count },
        Articles: { count },
        Courses: {
            count,
            async findOne() {
                return { nom: "Foulées", date: "2026-10-10" };
            },
        },
    });
    assert.deepEqual(res.corps, {
        etat: true,
        detail: { nbrAdherents: 1, invitationsEnAttente: 2, nbrArticles: 3, prochaineCourse: { nom: "Foulées", date: "2026-10-10" }, nbrCoursesSuggestion: 4, nbrArticlesSuggestion: 5 },
    });
});

// verifierCaptcha (fetch remplacé : aucun appel réseau)

test("verifierCaptcha : jeton manquant, 400 sans appel à Cloudflare", async () => {
    globalThis.fetch = async () => {
        throw new Error("ne doit pas être appelé");
    };
    const res = await appeler(verifierCaptcha, { body: {} });
    assert.equal(res.statut, 400);
});

test("verifierCaptcha : jeton accepté par Cloudflare", async () => {
    const appels = [];
    globalThis.fetch = async (url, options) => {
        appels.push({ url, options });
        return {
            async json() {
                return { success: true };
            },
        };
    };
    const res = await appeler(verifierCaptcha, { body: { token: "jeton" } });
    assert.deepEqual(res.corps, { etat: true, detail: "Vérification réussie." });
    assert.equal(appels[0].url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.equal(appels[0].options.body.get("response"), "jeton");
});

test("verifierCaptcha : jeton refusé par Cloudflare, 400", async () => {
    globalThis.fetch = async () => ({
        async json() {
            return { success: false };
        },
    });
    const res = await appeler(verifierCaptcha, { body: { token: "jeton" } });
    assert.equal(res.statut, 400);
    assert.equal(res.corps.etat, false);
});

test("verifierCaptcha : Cloudflare injoignable, 500", async () => {
    mock.method(logger, "error", () => {});
    globalThis.fetch = async () => {
        throw new Error("réseau");
    };
    const res = await appeler(verifierCaptcha, { body: { token: "jeton" } });
    assert.equal(res.statut, 500);
});
