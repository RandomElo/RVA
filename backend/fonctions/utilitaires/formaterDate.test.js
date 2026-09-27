import { test } from "node:test";
import assert from "node:assert/strict";

import { formaterDate } from "./formaterDate.js";

test("formaterDate écrit une date ISO en toutes lettres en français", () => {
    assert.equal(formaterDate("2026-09-26"), "26 septembre 2026");
    assert.equal(formaterDate("2026-01-01"), "1 janvier 2026");
});

test("formaterDate ne décale pas une date AAAA-MM-JJ selon le fuseau du serveur", () => {
    const fuseauInitial = process.env.TZ;
    try {
        for (const fuseau of ["America/New_York", "Pacific/Honolulu", "Europe/Paris", "Pacific/Kiritimati"]) {
            process.env.TZ = fuseau;
            assert.equal(formaterDate("2026-09-26"), "26 septembre 2026", fuseau);
            assert.equal(formaterDate("2026-01-01"), "1 janvier 2026", fuseau);
        }
    } finally {
        if (fuseauInitial === undefined) delete process.env.TZ;
        else process.env.TZ = fuseauInitial;
    }
});

test("formaterDate accepte un objet Date", () => {
    assert.equal(formaterDate(new Date(2026, 1, 28, 12)), "28 février 2026");
});
