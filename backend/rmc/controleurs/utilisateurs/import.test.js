import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import AdmZip from "adm-zip";
import sharp from "sharp";

import { DOSSIER_ADHERENTS } from "../../../fonctions/utilitaires/enregistrementPhoto.js";
import { appeler, intercepterMails } from "../testsUtilitaires.js";
import { ajouterPhotosZip, inviterAdherentCsv } from "./import.js";

const mailsEnvoyes = intercepterMails();
afterEach(() => {
    mailsEnvoyes.length = 0;
    mock.restoreAll();
});

// ---------- inviterAdherentCsv ----------

test("inviterAdherentCsv : fichier absent (400)", async () => {
    const res = await appeler(inviterAdherentCsv, {});
    assert.equal(res.statut, 400);
});

test("inviterAdherentCsv : CSV mal formé (400)", async () => {
    const res = await appeler(inviterAdherentCsv, { file: { buffer: Buffer.from('Jean;"Dupont;01/02;jean@exemple.fr\n') } });
    assert.equal(res.statut, 400);
    assert.deepEqual(res.corps, { etat: false, detail: "Fichier CSV illisible." });
});

test("inviterAdherentCsv : crée les lignes valides et liste les erreurs", async () => {
    const crees = [];
    const Utilisateurs = {
        async findAll({ where }) {
            // Requête des mails existants, puis liste finale des adhérents
            return where.mail ? [{ mail: "existant@exemple.fr" }] : [];
        },
        async create(donnees) { crees.push(donnees); return { id: crees.length }; },
    };
    const Tokens = { async create() {}, async destroy() {} };
    const csv = [
        "Jean;Dupont;01/02/1990;jean@exemple.fr",
        "Paul;Martin;03/04;existant@exemple.fr",
        "Luc;Petit;99/99;luc@exemple.fr",
    ].join("\n");
    const res = await appeler(inviterAdherentCsv, { file: { buffer: Buffer.from(csv) }, Utilisateurs, Tokens });
    assert.equal(res.statut, 200);
    assert.deepEqual(crees.map((u) => u.mail), ["jean@exemple.fr"]);
    assert.equal(crees[0].dateNaissance, "01/02");
    assert.equal(mailsEnvoyes.length, 1);
    assert.deepEqual(res.corps.detail.erreurs, [
        "Ligne 2 : utilisateur déjà existant (existant@exemple.fr).",
        'Ligne 3 : la date de naissance "99/99" est invalide.',
    ]);
});

// ---------- ajouterPhotosZip ----------

test("ajouterPhotosZip : la nouvelle photo est supprimée si la mise à jour en base échoue", async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#ffffff" } }).png().toBuffer();
    const zip = new AdmZip();
    zip.addFile("Jean_Dupont.png", png);

    const Utilisateurs = {
        async findAll() { return [{ id: 1, prenom: "Jean", nom: "Dupont", cheminTrombinoscope: null }]; },
        async update() { throw new Error("base indisponible"); },
    };
    const avant = new Set(fs.readdirSync(DOSSIER_ADHERENTS));
    const res = await appeler(ajouterPhotosZip, { file: { buffer: zip.toBuffer() }, Utilisateurs });
    const nouveaux = fs.readdirSync(DOSSIER_ADHERENTS).filter((f) => !avant.has(f));

    assert.equal(res.statut, 500);
    assert.deepEqual(nouveaux, []);
});
