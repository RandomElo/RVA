import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import gestionErreur from "./gestionErreur.js";
import { logger } from "../../fonctions/utilitaires/logger.js";

afterEach(() => mock.restoreAll());

const fauxRes = (headersSent = false) => ({
    headersSent,
    statut: 200,
    corps: undefined,
    reponses: 0,
    status(code) {
        this.statut = code;
        return this;
    },
    json(corps) {
        this.reponses++;
        this.corps = corps;
        return this;
    },
});

const requete = { originalUrl: "/api/test", method: "POST", ip: "127.0.0.1", idUtilisateur: 7 };

test("gestionErreur : erreur levée, 500 avec le message fourni", async () => {
    mock.method(logger, "error", () => {});
    const controleur = gestionErreur(
        async () => {
            throw new Error("boum");
        },
        "controleurTest",
        "Erreur lors du test",
    );
    const res = fauxRes();
    await controleur(requete, res, () => {});
    assert.equal(res.statut, 500);
    assert.deepEqual(res.corps, { etat: false, detail: "Erreur lors du test" });
});

test("gestionErreur : erreur après envoi des en-têtes, pas de seconde réponse", async () => {
    mock.method(logger, "error", () => {});
    const controleur = gestionErreur(
        async () => {
            throw new Error("trop tard");
        },
        "controleurTest",
        "Erreur lors du test",
    );
    const res = fauxRes(true);
    await controleur(requete, res, () => {});
    assert.equal(res.reponses, 0);
    assert.equal(res.statut, 200);
});

test("gestionErreur : l'erreur est journalisée avec son contexte", async () => {
    const journal = mock.method(logger, "error", () => {});
    const controleur = gestionErreur(
        async () => {
            throw new Error("boum");
        },
        "controleurTest",
        "Erreur lors du test",
    );
    await controleur(requete, fauxRes(), () => {});
    assert.equal(journal.mock.callCount(), 1);
    const [contexte, message] = journal.mock.calls[0].arguments;
    assert.equal(contexte.type, "ERREUR_APPLICATIVE");
    assert.equal(contexte.emplacement, "controleurTest");
    assert.equal(contexte.route, "/api/test");
    assert.equal(contexte.userId, 7);
    assert.equal(contexte.erreur.message, "boum");
    assert.match(message, /controleurTest.*boum/);
});

test("gestionErreur : sans erreur, la réponse du contrôleur est conservée et rien n'est journalisé", async () => {
    const journal = mock.method(logger, "error", () => {});
    const controleur = gestionErreur(async (req, res) => res.json({ etat: true }), "controleurTest", "Erreur lors du test");
    const res = fauxRes();
    await controleur(requete, res, () => {});
    assert.deepEqual(res.corps, { etat: true });
    assert.equal(journal.mock.callCount(), 0);
});
