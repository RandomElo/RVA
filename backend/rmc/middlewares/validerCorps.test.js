import { test } from "node:test";
import assert from "node:assert/strict";

import { fauxRes } from "../controleurs/testsUtilitaires.js";
import { validerCorps } from "./validerCorps.js";

const executer = (champs, body) => {
    const res = fauxRes();
    let suivant = 0;
    validerCorps(champs)({ body }, res, () => { suivant++; });
    return { res, suivant };
};

test("validerCorps : tous les champs renseignés, passe au contrôleur sans répondre", () => {
    for (const valeur of ["texte", "0", 1, true, {}, []]) {
        const { res, suivant } = executer(["a", "b"], { a: "x", b: valeur });
        assert.equal(suivant, 1, JSON.stringify(valeur));
        assert.equal(res.headersSent, false);
    }
});

test("validerCorps : champ absent ou falsy, 400 sans passer au contrôleur (même sémantique que `!champ`)", () => {
    for (const valeur of [undefined, null, "", 0, false]) {
        const { res, suivant } = executer(["a", "b"], { a: "x", b: valeur });
        assert.equal(suivant, 0, String(valeur));
        assert.equal(res.statut, 400);
        assert.deepEqual(res.corps, { etat: false, detail: "Requête incorrecte" });
    }
});

test("validerCorps : corps absent (requête sans JSON), 400", () => {
    const { res, suivant } = executer(["a"], undefined);
    assert.equal(suivant, 0);
    assert.equal(res.statut, 400);
    assert.deepEqual(res.corps, { etat: false, detail: "Requête incorrecte" });
});

test("validerCorps : les champs non listés ne sont pas contrôlés", () => {
    const { suivant } = executer(["a"], { a: "x", b: "" });
    assert.equal(suivant, 1);
});
