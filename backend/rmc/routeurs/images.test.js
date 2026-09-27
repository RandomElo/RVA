import { test } from "node:test";
import assert from "node:assert/strict";
import e from "express";
import request from "supertest";

import routeurImages from "./images.js";
import { accessibiliteBdd } from "../middlewares/accessibiliteBdd.js";

// Aucun modèle n'est censé être appelé par les routes testées : tout accès échoue le test
const modeleInterdit = new Proxy({}, {
    get() { throw new Error("Accès inattendu à la base"); },
});

const app = e();
app.use(accessibiliteBdd({ Images: modeleInterdit, Utilisateurs: modeleInterdit }));
app.use("/images", routeurImages);

test("GET /images/i/:nomFichier refuse le path traversal encodé (400)", async () => {
    const reponse = await request(app).get("/images/i/..%2F..%2Fpackage.json");
    assert.equal(reponse.status, 400);
    assert.deepEqual(reponse.body, { etat: false, detail: "Requête incorrecte" });
});

test("GET /images/i/:nomFichier refuse un fichier caché (400)", async () => {
    const reponse = await request(app).get("/images/i/.env");
    assert.equal(reponse.status, 400);
});

test("GET /images/i/:nomFichier renvoie 404 pour un fichier absent", async () => {
    const reponse = await request(app).get("/images/i/inexistant-0000.webp");
    assert.equal(reponse.status, 404);
    assert.deepEqual(reponse.body, { etat: false, detail: "Photo introuvable" });
});
