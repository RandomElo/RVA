import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import { validerDatePublicationFuture } from "./validationDate.js";

afterEach(() => mock.timers.reset());

// 27/09/2026 à 22h00 à Paris (20h00 UTC)
const figerHorloge = (iso = "2026-09-27T20:00:00Z") => {
    mock.timers.enable({ apis: ["Date"], now: new Date(iso) });
};

test("validerDatePublicationFuture : aujourd'hui et plus tard acceptés", () => {
    figerHorloge();
    assert.equal(validerDatePublicationFuture("2026-09-27"), null);
    assert.equal(validerDatePublicationFuture("2026-10-01"), null);
});

test("validerDatePublicationFuture : la veille est refusée", () => {
    figerHorloge();
    assert.equal(validerDatePublicationFuture("2026-09-26"), "Date déjà passée.");
});

test("validerDatePublicationFuture : après minuit à Paris, la date UTC encore courante est refusée", () => {
    figerHorloge("2026-09-27T22:30:00Z"); // 28/09 à 00h30 à Paris
    assert.equal(validerDatePublicationFuture("2026-09-27"), "Date déjà passée.");
});

test("validerDatePublicationFuture : format invalide refusé", () => {
    figerHorloge();
    for (const date of ["27/09/2026", "2026-9-27", "2026-13-45", ""]) {
        assert.equal(validerDatePublicationFuture(date), "Date invalide.", date);
    }
});
