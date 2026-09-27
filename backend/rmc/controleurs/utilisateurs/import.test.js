import { test, after, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import AdmZip from "adm-zip";
import sharp from "sharp";

import { appeler, intercepterMails } from "../testsUtilitaires.js";

// Aucune écriture dans le vrai dossier medias/adherents : DOSSIER_ADHERENTS dépend de process.cwd()
// au moment de l'import, on se place donc dans un dossier temporaire avant d'importer le contrôleur
const dossierTemporaire = fs.mkdtempSync(path.join(os.tmpdir(), "rva-import-"));
const cwdOriginal = process.cwd();
process.chdir(dossierTemporaire);

const { ajouterPhotosZip, inviterAdherentCsv } = await import("./import.js");
const { DOSSIER_ADHERENTS } = await import("../../../fonctions/utilitaires/enregistrementPhoto.js");

const mailsEnvoyes = intercepterMails();
afterEach(() => {
    mailsEnvoyes.length = 0;
    mock.restoreAll();
    // Chaque test repart d'un dossier d'adhérents vide
    for (const fichier of fs.readdirSync(DOSSIER_ADHERENTS)) {
        fs.rmSync(path.join(DOSSIER_ADHERENTS, fichier), { force: true });
    }
});
after(() => {
    process.chdir(cwdOriginal);
    fs.rmSync(dossierTemporaire, { recursive: true, force: true });
});

const pngValide = () =>
    sharp({ create: { width: 2, height: 2, channels: 3, background: "#ffffff" } })
        .png()
        .toBuffer();

const jpgValide = () =>
    sharp({ create: { width: 2, height: 2, channels: 3, background: "#000000" } })
        .jpeg()
        .toBuffer();

const zipAvec = (fichiers) => {
    const zip = new AdmZip();
    for (const [nom, contenu] of fichiers) zip.addFile(nom, contenu);
    return zip.toBuffer();
};

// Modèle factice : le premier findAll (sans where) sert à la recherche par nom,
// le second (where role adherent) à la liste renvoyée au client
const fauxUtilisateurs = (utilisateurs) => ({
    misesAJour: [],
    liste: [{ id: 1, prenom: "Jean", nom: "Dupont" }],
    async findAll(options) {
        return options.where ? this.liste : utilisateurs;
    },
    async update(valeurs, options) {
        this.misesAJour.push([valeurs, options]);
    },
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
        async create(donnees) {
            crees.push(donnees);
            return { id: crees.length };
        },
    };
    const Tokens = { async create() {}, async destroy() {} };
    const csv = ["Jean;Dupont;01/02/1990;jean@exemple.fr", "Paul;Martin;03/04;existant@exemple.fr", "Luc;Petit;99/99;luc@exemple.fr"].join("\n");
    const res = await appeler(inviterAdherentCsv, { file: { buffer: Buffer.from(csv) }, Utilisateurs, Tokens });
    assert.equal(res.statut, 200);
    assert.deepEqual(
        crees.map((u) => u.mail),
        ["jean@exemple.fr"],
    );
    assert.equal(crees[0].dateNaissance, "01/02");
    assert.equal(mailsEnvoyes.length, 1);
    assert.deepEqual(res.corps.detail.erreurs, ["Ligne 2 : utilisateur déjà existant (existant@exemple.fr).", 'Ligne 3 : la date de naissance "99/99" est invalide.']);
});

// ---------- ajouterPhotosZip ----------

test("ajouterPhotosZip : archive absente (400)", async () => {
    const res = await appeler(ajouterPhotosZip, {});
    assert.equal(res.statut, 400);
    assert.deepEqual(res.corps, { etat: false, detail: "Aucune archive zip fournie." });
});

test("ajouterPhotosZip : la nouvelle photo est supprimée si la mise à jour en base échoue", async () => {
    const Utilisateurs = {
        async findAll() {
            return [{ id: 1, prenom: "Jean", nom: "Dupont", cheminTrombinoscope: null }];
        },
        async update() {
            throw new Error("base indisponible");
        },
    };
    const res = await appeler(ajouterPhotosZip, { file: { buffer: zipAvec([["Jean_Dupont.png", await pngValide()]]) }, Utilisateurs });

    assert.equal(res.statut, 500);
    assert.deepEqual(fs.readdirSync(DOSSIER_ADHERENTS), []);
});

test("ajouterPhotosZip : extension interdite, fichier ignoré et signalé", async () => {
    const Utilisateurs = fauxUtilisateurs([{ id: 1, prenom: "Jean", nom: "Dupont", cheminTrombinoscope: null }]);
    const res = await appeler(ajouterPhotosZip, { file: { buffer: zipAvec([["Jean_Dupont.gif", await pngValide()]]) }, Utilisateurs });

    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps, { etat: true, detail: { donnees: Utilisateurs.liste, erreurs: ["Jean_Dupont.gif : extension interdite"] } });
    assert.deepEqual(Utilisateurs.misesAJour, []);
    assert.deepEqual(fs.readdirSync(DOSSIER_ADHERENTS), []);
});

test("ajouterPhotosZip : utilisateur inexistant, fichier ignoré et signalé", async () => {
    const Utilisateurs = fauxUtilisateurs([{ id: 1, prenom: "Jean", nom: "Dupont", cheminTrombinoscope: null }]);
    const res = await appeler(ajouterPhotosZip, { file: { buffer: zipAvec([["Paul_Martin.png", await pngValide()]]) }, Utilisateurs });

    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps.detail.erreurs, ["Paul_Martin.png : utilisateur inexistant"]);
    assert.deepEqual(Utilisateurs.misesAJour, []);
    assert.deepEqual(fs.readdirSync(DOSSIER_ADHERENTS), []);
});

test("ajouterPhotosZip : image illisible, fichier ignoré et signalé", async () => {
    const Utilisateurs = fauxUtilisateurs([{ id: 1, prenom: "Jean", nom: "Dupont", cheminTrombinoscope: "ancienne.webp" }]);
    fs.writeFileSync(path.join(DOSSIER_ADHERENTS, "ancienne.webp"), "ancienne");
    const res = await appeler(ajouterPhotosZip, { file: { buffer: zipAvec([["Jean_Dupont.jpg", crypto.randomBytes(256)]]) }, Utilisateurs });

    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps.detail.erreurs, ["Jean_Dupont.jpg : image illisible ou corrompue"]);
    assert.deepEqual(Utilisateurs.misesAJour, []);
    // L'ancienne photo est conservée, aucun fichier partiel n'est laissé
    assert.deepEqual(fs.readdirSync(DOSSIER_ADHERENTS), ["ancienne.webp"]);
});

test("ajouterPhotosZip : enregistre la photo en WebP, met à jour la base et supprime l'ancienne", async () => {
    const Utilisateurs = fauxUtilisateurs([
        { id: 1, prenom: "Jean", nom: "Dupont", cheminTrombinoscope: "ancienne.webp" },
        { id: 2, prenom: "Paul", nom: "Martin", cheminTrombinoscope: null },
    ]);
    fs.writeFileSync(path.join(DOSSIER_ADHERENTS, "ancienne.webp"), "ancienne");
    // Les sous-dossiers de l'archive sont ignorés : seul le nom du fichier compte
    const zip = zipAvec([
        ["photos/Jean_Dupont.JPG", await jpgValide()],
        ["Paul_Martin.png", await pngValide()],
    ]);
    const res = await appeler(ajouterPhotosZip, { file: { buffer: zip }, Utilisateurs });

    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps, { etat: true, detail: { donnees: Utilisateurs.liste, erreurs: [] } });

    const fichiers = fs.readdirSync(DOSSIER_ADHERENTS);
    assert.equal(fichiers.length, 2);
    assert.ok(!fichiers.includes("ancienne.webp"));
    for (const fichier of fichiers) {
        assert.match(fichier, /\.webp$/);
        const { format } = await sharp(path.join(DOSSIER_ADHERENTS, fichier)).metadata();
        assert.equal(format, "webp");
    }

    assert.equal(Utilisateurs.misesAJour.length, 2);
    // adm-zip peut réordonner les entrées : on compare les mises à jour indépendamment de leur ordre
    const cheminsParId = Object.fromEntries(Utilisateurs.misesAJour.map(([valeurs, options]) => [options.where.id, valeurs.cheminTrombinoscope]));
    assert.deepEqual(Object.keys(cheminsParId).sort(), ["1", "2"]);
    assert.deepEqual(Object.values(cheminsParId).sort(), [...fichiers].sort());
});

test("ajouterPhotosZip : deux photos de la même personne, seule la dernière est conservée", async () => {
    const Utilisateurs = fauxUtilisateurs([{ id: 1, prenom: "Jean", nom: "Dupont", cheminTrombinoscope: "ancienne.webp" }]);
    fs.writeFileSync(path.join(DOSSIER_ADHERENTS, "ancienne.webp"), "ancienne");
    const zip = zipAvec([
        ["Jean_Dupont.png", await pngValide()],
        ["a/Jean_Dupont.jpg", await jpgValide()],
    ]);
    const res = await appeler(ajouterPhotosZip, { file: { buffer: zip }, Utilisateurs });

    assert.equal(res.statut, 200);
    assert.deepEqual(res.corps.detail.erreurs, []);
    assert.equal(Utilisateurs.misesAJour.length, 2);
    const [premiere, seconde] = Utilisateurs.misesAJour.map(([valeurs]) => valeurs.cheminTrombinoscope);
    assert.notEqual(premiere, seconde);
    assert.deepEqual(Utilisateurs.misesAJour[1][1], { where: { id: 1 } });
    // La première photo importée est remplacée par la seconde : ni elle ni l'ancienne ne restent sur le disque
    assert.deepEqual(fs.readdirSync(DOSSIER_ADHERENTS), [seconde]);
});
