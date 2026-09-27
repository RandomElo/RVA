import { test } from "node:test";
import assert from "node:assert/strict";

import { lireLignesCsv, mailsDesLignesCsv, validerLignesCsv } from "./validationCsv.js";

const valider = (contenu, mailsExistants = new Set()) => validerLignesCsv(lireLignesCsv(contenu), mailsExistants);

test("lireLignesCsv ignore le BOM et les lignes vides en gardant le numéro de ligne réel", () => {
    const lignes = lireLignesCsv("﻿Jean;Dupont;01/02;jean@exemple.fr\n\nMarie;Durand;03/04;marie@exemple.fr\n");
    assert.deepEqual(lignes, [
        { colonnes: ["Jean", "Dupont", "01/02", "jean@exemple.fr"], numero: 1 },
        { colonnes: ["Marie", "Durand", "03/04", "marie@exemple.fr"], numero: 3 },
    ]);
});

test("lireLignesCsv lève une erreur sur un guillemet non fermé", () => {
    assert.throws(() => lireLignesCsv('Jean;"Dupont;01/02;jean@exemple.fr\n'));
});

test("mailsDesLignesCsv ne garde que les lignes à 4 colonnes avec un mail", () => {
    const lignes = lireLignesCsv("Jean;Dupont;01/02;jean@exemple.fr\nA;B;C\nMarie;Durand;03/04;\n");
    assert.deepEqual(mailsDesLignesCsv(lignes), ["jean@exemple.fr"]);
});

test("validerLignesCsv accepte une ligne valide et normalise la date", () => {
    const { aCreer, erreurs } = valider("Jean;Dupont;01-02-1990;jean@exemple.fr\nÉlise;D'Arc-Lefèvre;31.12;elise@exemple.fr\n");
    assert.deepEqual(erreurs, []);
    assert.deepEqual(aCreer, [
        { ligne: 1, prenom: "Jean", nom: "Dupont", email: "jean@exemple.fr", dateNaissance: "01/02" },
        { ligne: 2, prenom: "Élise", nom: "D'Arc-Lefèvre", email: "elise@exemple.fr", dateNaissance: "31/12" },
    ]);
});

test("validerLignesCsv refuse un mauvais nombre de colonnes", () => {
    const { aCreer, erreurs } = valider("Jean;Dupont;01/02\nJean;Dupont;01/02;jean@exemple.fr;en trop\n");
    assert.equal(aCreer.length, 0);
    assert.deepEqual(erreurs, [
        'Ligne 1 : le format doit être "Prénom;Nom;Date de naissance;Adresse mail".',
        'Ligne 2 : le format doit être "Prénom;Nom;Date de naissance;Adresse mail".',
    ]);
});

test("validerLignesCsv refuse une colonne vide", () => {
    const { aCreer, erreurs } = valider("Jean;;01/02;jean@exemple.fr\n");
    assert.equal(aCreer.length, 0);
    assert.deepEqual(erreurs, ["Ligne 1 : une ou plusieurs colonnes sont vides."]);
});

test("validerLignesCsv refuse un nom avec des caractères non autorisés", () => {
    const { aCreer, erreurs } = valider("Jean;<script>;01/02;jean@exemple.fr\n");
    assert.equal(aCreer.length, 0);
    assert.match(erreurs[0], /^Ligne 1 : le prénom ou le nom .* contient des caractères non autorisés\.$/);
});

test("validerLignesCsv refuse un mail invalide", () => {
    const { aCreer, erreurs } = valider("Jean;Dupont;01/02;jean@exemple\n");
    assert.equal(aCreer.length, 0);
    assert.deepEqual(erreurs, ['Ligne 1 : l\'adresse email "jean@exemple" est invalide.']);
});

test("validerLignesCsv refuse une date invalide", () => {
    const { aCreer, erreurs } = valider("Jean;Dupont;32/01;jean@exemple.fr\nMarie;Durand;01/13/1990;marie@exemple.fr\n");
    assert.equal(aCreer.length, 0);
    assert.deepEqual(erreurs, [
        'Ligne 1 : la date de naissance "32/01" est invalide.',
        'Ligne 2 : la date de naissance "01/13" est invalide.',
    ]);
});

test("validerLignesCsv refuse un mail déjà présent en base", () => {
    const { aCreer, erreurs } = valider("Jean;Dupont;01/02;jean@exemple.fr\n", new Set(["jean@exemple.fr"]));
    assert.equal(aCreer.length, 0);
    assert.deepEqual(erreurs, ["Ligne 1 : utilisateur déjà existant (jean@exemple.fr)."]);
});

test("validerLignesCsv refuse un doublon dans le fichier sans tenir compte de la casse", () => {
    const { aCreer, erreurs } = valider("Jean;Dupont;01/02;jean@exemple.fr\nJean;Dupont;01/02;JEAN@Exemple.fr\n");
    assert.equal(aCreer.length, 1);
    assert.equal(aCreer[0].ligne, 1);
    assert.deepEqual(erreurs, ["Ligne 2 : adresse email en double dans le fichier (JEAN@Exemple.fr)."]);
});
