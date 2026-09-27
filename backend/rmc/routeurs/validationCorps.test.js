import { test } from "node:test";
import assert from "node:assert/strict";
import e from "express";
import request from "supertest";

import routeurAutres from "./autres.js";
import routeurBlog from "./blog.js";
import routeurCourses from "./courses.js";
import routeurPages from "./pages.js";
import routeurSpecialistes from "./specialistes.js";
import routeurStatistiques from "./statistiques.js";
import routeurUtilisateurs from "./utilisateurs.js";
import { accessibiliteBdd } from "../middlewares/accessibiliteBdd.js";
import { accesUtilisateur } from "../middlewares/accesUtilisateurs.js";
import { intercepterMails } from "../controleurs/testsUtilitaires.js";

// Contrôles de présence des champs portés par validerCorps dans les routeurs.
// Aucun modèle n'est censé être appelé avant le 400 : tout accès échoue le test,
// sauf Utilisateurs.findByPk qu'utilise accesAdmin (compte administrateur).
const modeleInterdit = new Proxy({}, {
    get() { throw new Error("Accès inattendu à la base"); },
});
const Utilisateurs = new Proxy({ async findByPk(id) { return { id, role: "administrateur" }; } }, {
    get(cible, nom) {
        if (nom === "findByPk") return cible.findByPk;
        throw new Error(`Accès inattendu à Utilisateurs.${String(nom)}`);
    },
});

const mailsEnvoyes = intercepterMails();

const app = e();
app.use(e.json());
app.use(accessibiliteBdd({ Utilisateurs, Tokens: modeleInterdit, Articles: modeleInterdit, Courses: modeleInterdit, Statistiques: modeleInterdit, Specialistes: modeleInterdit, Images: modeleInterdit, Pages: modeleInterdit, AdherentsCourse: modeleInterdit }));
// Remplace verificationCookie : l'en-tête de test tient lieu de cookie de session valide
app.use((req, res, next) => {
    const id = req.get("x-test-utilisateur");
    if (id) req.idUtilisateur = Number(id);
    next();
});
// Mêmes préfixes que serveur.js
app.use("/utilisateurs", routeurUtilisateurs);
app.use("/autres", routeurAutres);
app.use("/articles", routeurBlog);
app.use("/courses", routeurCourses);
app.use("/specialistes", accesUtilisateur, routeurSpecialistes);
app.use("/statistiques", routeurStatistiques);
app.use("/pages", routeurPages);

const REFUS = { etat: false, detail: "Requête incorrecte" };
const NON_CONNECTE = { etat: false, detail: "Vous n'êtes pas connecté" };

const envoyer = (methode, route, body, { connecte = true } = {}) => {
    let requete = request(app)[methode](route);
    if (connecte) requete = requete.set("x-test-utilisateur", "1");
    return body === undefined ? requete : requete.send(body);
};

// Pour chaque champ requis : absent puis vide, 400 au format habituel
async function verifierChampsRequis(methode, route, corpsValide) {
    for (const champ of Object.keys(corpsValide)) {
        for (const valeur of [undefined, ""]) {
            const body = { ...corpsValide, [champ]: valeur };
            const reponse = await envoyer(methode, route, body);
            assert.equal(reponse.status, 400, `${route} ${champ}=${JSON.stringify(valeur)}`);
            assert.deepEqual(reponse.body, REFUS);
        }
    }
}

// ---------- Routes publiques ----------

test("POST /autres/token : token manquant ou vide, 400", async () => {
    await verifierChampsRequis("post", "/autres/token", { token: "abc" });
});

test("POST /autres/envoyer-mail-contact : champ manquant ou vide, 400 sans mail", async () => {
    await verifierChampsRequis("post", "/autres/envoyer-mail-contact", { nom: "Jean Dupont", mail: "jean@exemple.fr", message: "Bonjour, une question." });
    assert.equal(mailsEnvoyes.length, 0);
});

test("POST /autres/envoyer-mail-contact : champs présents, la requête atteint le contrôleur", async () => {
    const reponse = await envoyer("post", "/autres/envoyer-mail-contact", { nom: "Jean<script>", mail: "jean@exemple.fr", message: "Bonjour, une question." }, { connecte: false });
    assert.equal(reponse.status, 200);
    assert.deepEqual(reponse.body, { etat: true, detail: { message: false, detail: "Nom invalide" } });
});

test("POST /autres/token : corps absent (pas de JSON), 400 et non 500", async () => {
    const reponse = await envoyer("post", "/autres/token", undefined, { connecte: false });
    assert.equal(reponse.status, 400);
    assert.deepEqual(reponse.body, REFUS);
});

test("POST /utilisateurs/connexion-par-mail : mail manquant ou vide, 400", async () => {
    await verifierChampsRequis("post", "/utilisateurs/connexion-par-mail", { mail: "jean@exemple.fr" });
});

// ---------- Routes protégées : le 403 reste prioritaire sur le 400 ----------

const ROUTES_PROTEGEES = [
    ["delete", "/courses/supprimer"],
    ["post", "/specialistes/cree"],
    ["post", "/specialistes/modifier"],
    ["post", "/specialistes/suggestion"],
    ["delete", "/specialistes/supprimer"],
    ["delete", "/pages/supprimer"],
    ["post", "/statistiques/mail"],
    ["post", "/articles/cree"],
    ["delete", "/articles/supprimer"],
    ["post", "/articles/suggestion"],
    ["post", "/utilisateurs/inviter"],
    ["post", "/utilisateurs/modifier"],
    ["delete", "/utilisateurs/supprimer"],
];

test("routes protégées : corps vide sans session, 403 avant la validation", async () => {
    for (const [methode, route] of ROUTES_PROTEGEES) {
        const reponse = await envoyer(methode, route, {}, { connecte: false });
        assert.equal(reponse.status, 403, route);
        assert.deepEqual(reponse.body, NON_CONNECTE);
    }
});

test("DELETE /courses/supprimer : nom manquant ou vide, 400", async () => {
    await verifierChampsRequis("delete", "/courses/supprimer", { nom: "Foulées" });
});

test("spécialistes (cree, modifier, suggestion) : champ obligatoire manquant ou vide, 400 sans enregistrement", async () => {
    const corps = { nom: "Dr Test", specialite: "kine_sport", detail: "Kiné du sport", adresse: "Vincennes" };
    for (const route of ["/specialistes/cree", "/specialistes/modifier", "/specialistes/suggestion"]) {
        await verifierChampsRequis("post", route, corps);
    }
    assert.equal(mailsEnvoyes.length, 0);
});

test("DELETE /specialistes/supprimer : nom manquant ou vide, 400", async () => {
    await verifierChampsRequis("delete", "/specialistes/supprimer", { nom: "Dr Test" });
});

test("DELETE /pages/supprimer : nom manquant ou vide, 400", async () => {
    await verifierChampsRequis("delete", "/pages/supprimer", { nom: "Page" });
});

test("POST /statistiques/mail : début ou fin manquant, 400 sans mail", async () => {
    await verifierChampsRequis("post", "/statistiques/mail", { debut: "2026-08-01", fin: "2026-09-01" });
    assert.equal(mailsEnvoyes.length, 0);
});

test("POST /articles/cree : article ou statut manquant, 400", async () => {
    await verifierChampsRequis("post", "/articles/cree", { article: { titre: "T" }, statut: "publie" });
});

test("DELETE /articles/supprimer : nom manquant ou vide, 400", async () => {
    await verifierChampsRequis("delete", "/articles/supprimer", { nom: "T" });
});

test("POST /articles/suggestion : article manquant, 400", async () => {
    await verifierChampsRequis("post", "/articles/suggestion", { article: { titre: "T" } });
});

test("adhérents (inviter, modifier) : champ manquant ou vide, 400", async () => {
    const corps = { prenom: "Jean", nom: "Dupont", mail: "jean@exemple.fr", dateNaissance: "01/02" };
    for (const route of ["/utilisateurs/inviter", "/utilisateurs/modifier"]) {
        await verifierChampsRequis("post", route, corps);
    }
});

test("DELETE /utilisateurs/supprimer : nom manquant ou vide, 400", async () => {
    await verifierChampsRequis("delete", "/utilisateurs/supprimer", { nom: "jean@exemple.fr" });
});
