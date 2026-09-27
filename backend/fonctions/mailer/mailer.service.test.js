import { test, after } from "node:test";
import assert from "node:assert/strict";

import transporteur from "./transporteur.js";
import envoiMail from "./mailer.service.js";

const mailFromOriginal = process.env.MAIL_FROM;
process.env.MAIL_FROM = "expediteur@exemple.test";

after(() => {
    if (mailFromOriginal === undefined) delete process.env.MAIL_FROM;
    else process.env.MAIL_FROM = mailFromOriginal;
    transporteur.close();
});

// Remplace sendMail le temps du test (restauré automatiquement par t.mock)
const intercepter = (t, implementation = async () => ({ messageId: "id-test" })) =>
    t.mock.method(transporteur, "sendMail", implementation);

test("envoiMail : transmet destinataire, sujet, template, variables et expéditeur de l'environnement", async (t) => {
    const sendMail = intercepter(t);
    const context = { prenom: "Eloi", lien: "https://exemple.test/lien" };

    const resultat = await envoiMail("dest@exemple.test", "Sujet", "lienConnexion", context);

    assert.deepEqual(resultat, { messageId: "id-test" });
    assert.equal(sendMail.mock.callCount(), 1);
    const options = sendMail.mock.calls[0].arguments[0];
    assert.equal(options.from, "expediteur@exemple.test");
    assert.equal(options.to, "dest@exemple.test");
    assert.equal(options.subject, "Sujet");
    assert.equal(options.template, "lienConnexion");
    assert.deepEqual(options.context, context);
    assert.deepEqual(options.attachments, []);
    assert.deepEqual(JSON.parse(options.headers["X-Sib-Headers"]), {
        "X-Mailin-Tag": "PasDeTracking",
        "X-Mailin-tracking": "0",
    });
});

test("envoiMail : expéditeur relu à chaque envoi depuis MAIL_FROM", async (t) => {
    const sendMail = intercepter(t);
    const precedent = process.env.MAIL_FROM;
    process.env.MAIL_FROM = "autre@exemple.test";
    try {
        await envoiMail("dest@exemple.test", "Sujet", "contact", {});
    } finally {
        process.env.MAIL_FROM = precedent;
    }
    assert.equal(sendMail.mock.calls[0].arguments[0].from, "autre@exemple.test");
});

test("envoiMail : replyTo absent par défaut ou vide, aucune clé replyTo", async (t) => {
    const sendMail = intercepter(t);

    await envoiMail("dest@exemple.test", "Sujet", "contact", {});
    await envoiMail("dest@exemple.test", "Sujet", "contact", {}, null);
    await envoiMail("dest@exemple.test", "Sujet", "contact", {}, "");

    assert.equal(sendMail.mock.callCount(), 3);
    for (const appel of sendMail.mock.calls) {
        assert.equal(Object.hasOwn(appel.arguments[0], "replyTo"), false);
    }
});

test("envoiMail : replyTo fourni, transmis tel quel", async (t) => {
    const sendMail = intercepter(t);

    await envoiMail("dest@exemple.test", "Sujet", "contact", {}, "visiteur@exemple.test");

    assert.equal(sendMail.mock.calls[0].arguments[0].replyTo, "visiteur@exemple.test");
});

test("envoiMail : pièces jointes transmises", async (t) => {
    const sendMail = intercepter(t);
    const attachments = [{ filename: "stats.csv", content: Buffer.from("a;b") }];

    await envoiMail("dest@exemple.test", "Sujet", "recapStatistiques", {}, null, attachments);

    assert.deepEqual(sendMail.mock.calls[0].arguments[0].attachments, attachments);
});

test("envoiMail : l'erreur de sendMail est propagée à l'appelant", async (t) => {
    const erreur = new Error("SMTP indisponible");
    intercepter(t, async () => { throw erreur; });

    await assert.rejects(envoiMail("dest@exemple.test", "Sujet", "contact", {}), erreur);
});
