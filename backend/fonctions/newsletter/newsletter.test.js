import { test, afterEach } from "node:test";
import assert from "node:assert/strict";

import { intercepterMails } from "../../rmc/controleurs/testsUtilitaires.js";
import { notifierAbonnesNewsletter } from "./newsletter.js";

// Aucun mail réel : l'envoi SMTP est remplacé en mémoire
const mailsEnvoyes = intercepterMails();
afterEach(() => {
    mailsEnvoyes.length = 0;
});

const abonnes = [
    { id: 1, prenom: "Alice", mail: "alice@exemple.fr" },
    { id: 2, prenom: "Bruno", mail: "bruno@exemple.fr" },
    { id: 3, prenom: "Chloé", mail: "chloe@exemple.fr" },
];

const fauxUtilisateurs = (utilisateurs) => ({
    requetes: [],
    async findAll(options) {
        this.requetes.push(options);
        return utilisateurs;
    },
});

// Tokens factices : tokens existants par idUtilisateur, création éventuellement en échec pour certains
const fauxTokens = (existants, { echecCreationPour = [] } = {}) => ({
    crees: [],
    async findAll() {
        return Object.entries(existants).map(([id, token]) => ({ token, details: { idUtilisateur: Number(id) } }));
    },
    async create(donnees) {
        if (echecCreationPour.includes(donnees.details.idUtilisateur)) throw new Error("écriture impossible");
        this.crees.push(donnees);
    },
});

const newsletter = { titre: "Newsletter Octobre 2026", url: "newsletter-octobre-2026" };

test("notifierAbonnesNewsletter : adhérents abonnés uniquement", async () => {
    const Utilisateurs = fauxUtilisateurs([]);
    const resultat = await notifierAbonnesNewsletter({ Utilisateurs, Tokens: fauxTokens({}) }, newsletter);
    assert.deepEqual(Utilisateurs.requetes[0].where, { role: "adherent", recevoirNewsletter: true });
    assert.deepEqual(resultat, { total: 0, echecs: 0 });
    assert.equal(mailsEnvoyes.length, 0);
});

test("notifierAbonnesNewsletter : tokens existants réutilisés, manquants créés", async () => {
    const Tokens = fauxTokens({ 1: "tokenAlice" });
    const resultat = await notifierAbonnesNewsletter({ Utilisateurs: fauxUtilisateurs(abonnes), Tokens }, newsletter);

    assert.deepEqual(resultat, { total: 3, echecs: 0 });
    assert.deepEqual(Tokens.crees.map((t) => t.details.idUtilisateur).sort(), [2, 3]);
    for (const t of Tokens.crees) {
        assert.equal(t.type, "lienDesinscriptionNewsletter");
        assert.match(t.token, /^.{9}$/);
    }

    assert.equal(mailsEnvoyes.length, 3);
    const mailAlice = mailsEnvoyes.find((m) => m.to === "alice@exemple.fr");
    assert.equal(mailAlice.template, "newsletter");
    assert.equal(mailAlice.subject, "Newsletter Octobre 2026 – Running Vincennes Association");
    assert.equal(mailAlice.context.lien, process.env.IP_FRONTEND + "/article/newsletter-octobre-2026");
    assert.equal(mailAlice.context.lien_desinscription, process.env.IP_FRONTEND + "/t/tokenAlice");

    const tokenBruno = Tokens.crees.find((t) => t.details.idUtilisateur === 2).token;
    const mailBruno = mailsEnvoyes.find((m) => m.to === "bruno@exemple.fr");
    assert.equal(mailBruno.context.lien_desinscription, process.env.IP_FRONTEND + "/t/" + tokenBruno);
});

test("notifierAbonnesNewsletter : échecs comptés sans bloquer les autres envois", async () => {
    const Tokens = fauxTokens({ 1: "tokenAlice" }, { echecCreationPour: [2] });
    const resultat = await notifierAbonnesNewsletter({ Utilisateurs: fauxUtilisateurs(abonnes), Tokens }, newsletter);

    assert.deepEqual(resultat, { total: 3, echecs: 1 });
    assert.deepEqual(mailsEnvoyes.map((m) => m.to).sort(), ["alice@exemple.fr", "chloe@exemple.fr"]);
});
