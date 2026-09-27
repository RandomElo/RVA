import { test } from "node:test";
import assert from "node:assert/strict";

import { estNomFichierSur, estUrl } from "./validation.js";

test("estUrl accepte http et https", () => {
    assert.equal(estUrl("https://example.com"), true);
    assert.equal(estUrl("http://example.com/chemin?x=1"), true);
});

test("estUrl refuse les autres protocoles et les chaînes invalides", () => {
    assert.equal(estUrl("javascript:alert(1)"), false);
    assert.equal(estUrl("ftp://example.com"), false);
    assert.equal(estUrl("pas une url"), false);
    assert.equal(estUrl(undefined), false);
});

test("estNomFichierSur accepte un nom de fichier simple", () => {
    assert.equal(estNomFichierSur("photo-1_v2.webp"), true);
});

test("estNomFichierSur refuse le path traversal et les types non chaîne", () => {
    assert.equal(estNomFichierSur("../secret.txt"), false);
    assert.equal(estNomFichierSur("dossier/fichier.txt"), false);
    assert.equal(estNomFichierSur("a..b"), false);
    assert.equal(estNomFichierSur(".cache"), false);
    assert.equal(estNomFichierSur(42), false);
});
