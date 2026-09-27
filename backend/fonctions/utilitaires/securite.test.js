import { test } from "node:test";
import assert from "node:assert/strict";

import { secretsEgaux } from "./securite.js";

test("secretsEgaux : chaînes identiques, true", () => {
    assert.equal(secretsEgaux("secret-de-test", "secret-de-test"), true);
    assert.equal(secretsEgaux("é€ ü", "é€ ü"), true);
});

test("secretsEgaux : chaînes différentes de même longueur, false", () => {
    assert.equal(secretsEgaux("secret-de-test", "secret-de-tesX"), false);
    assert.equal(secretsEgaux("abc", "ABC"), false);
});

test("secretsEgaux : chaînes de longueurs différentes, false (sans lever d'erreur)", () => {
    assert.equal(secretsEgaux("secret", "secret-plus-long"), false);
    assert.equal(secretsEgaux("secret-plus-long", "secret"), false);
    assert.equal(secretsEgaux("secret ", "secret"), false);
});

test("secretsEgaux : chaînes vides, false", () => {
    assert.equal(secretsEgaux("", ""), false);
    assert.equal(secretsEgaux("", "secret"), false);
    assert.equal(secretsEgaux("secret", ""), false);
});

test("secretsEgaux : valeurs qui ne sont pas des chaînes, false", () => {
    const nonChaines = [undefined, null, 0, 123, true, {}, ["secret"], Buffer.from("secret")];
    for (const valeur of nonChaines) {
        assert.equal(secretsEgaux(valeur, "secret"), false, `reçu ${String(valeur)}`);
        assert.equal(secretsEgaux("secret", valeur), false, `attendu ${String(valeur)}`);
    }
    assert.equal(secretsEgaux(undefined, undefined), false);
    assert.equal(secretsEgaux(null, null), false);
    assert.equal(secretsEgaux(123, 123), false);
});
